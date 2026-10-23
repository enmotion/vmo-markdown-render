import { codeContext } from './code-context';
import { normalizeDocument } from './document';
import type { InputDocument } from './types';

// DOM 只承载文本、换行和受控标签；HTML 粘贴通过纯文本路径进入。
export function readDocument(root: HTMLElement): InputDocument {
  const nodes: InputDocument['nodes'] = [];
  function visit(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) { nodes.push({ type: 'text', text: node.textContent ?? '' }); return; }
    if (!(node instanceof HTMLElement)) return;
    if (node.dataset.mention) {
      try { nodes.push(JSON.parse(node.dataset.mention)); } catch { /* 非法 DOM 标签忽略。 */ }
      return;
    }
    if (node.tagName === 'BR') { if (!node.hasAttribute('data-tail')) nodes.push({ type: 'text', text: '\n' }); return; }
    if (/^(DIV|P)$/.test(node.tagName) && nodes.length) nodes.push({ type: 'text', text: '\n' });
    node.childNodes.forEach(visit);
  }
  root.childNodes.forEach(visit);
  return normalizeDocument({ version: 1, nodes });
}
function size(node: Node): number {
  if (node instanceof HTMLElement && node.dataset.mention) return 1;
  if (node instanceof HTMLElement && node.tagName === 'BR') return node.hasAttribute('data-tail') ? 0 : 1;
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.length ?? 0;
  return Array.from(node.childNodes).reduce((sum, child) => sum + size(child), 0);
}
export function getSelectionOffsets(root: HTMLElement): [number, number] | undefined {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return;
  function offset(target: Node, local: number) {
    let total = target.nodeType === Node.TEXT_NODE ? local : Array.from(target.childNodes).slice(0, local).reduce((sum, child) => sum + size(child), 0);
    for (let node = target; node !== root && node.parentNode; node = node.parentNode) {
      for (let previous = node.previousSibling; previous; previous = previous.previousSibling) total += size(previous);
    }
    return total;
  }
  return [offset(range.startContainer, range.startOffset), offset(range.endContainer, range.endOffset)];
}
export function setSelectionOffsets(root: HTMLElement, start: number, end = start) {
  function point(position: number): [Node, number] {
    function walk(parent: Node): [Node, number] | undefined {
      for (let index = 0; index < parent.childNodes.length; index++) {
        const node = parent.childNodes[index];
        if (node.nodeType === Node.TEXT_NODE) {
          const length = size(node);
          if (position <= length) return [node, position];
          position -= length;
        } else if (node instanceof HTMLElement && (node.dataset.mention || node.tagName === 'BR')) {
          if (position === 0) return [parent, index];
          position -= size(node);
        } else {
          const found = walk(node);
          if (found) return found;
        }
      }
    }
    return walk(root) ?? [root, root.childNodes.length];
  }
  const range = document.createRange();
  range.setStart(...point(start)); range.setEnd(...point(end));
  const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
}
export function paintDocument(root: HTMLElement, doc: InputDocument, remove: (index: number) => void, editable: boolean) {
  const fragment = document.createDocumentFragment();
  let position = 0;
  let before = '';
  for (const node of doc.nodes) {
    if (node.type === 'text') {
      // BR 保证尾部换行在 contenteditable 中可见，文本仍按原值保存。
      const lines = node.text.split('\n');
      lines.forEach((line, index) => {
        if (index) { fragment.append(document.createElement('br')); before += '\n'; }
        const code = codeContext(before + line).fenced || codeContext(before).fenced;
        if (code) {
          const span = document.createElement('span'); span.className = 'md-input__code'; span.textContent = line; fragment.append(span);
        } else {
          let offset = 0;
          for (const match of line.matchAll(/(`+)(.+?)\1/g)) {
            fragment.append(document.createTextNode(line.slice(offset, match.index)));
            const span = document.createElement('span'); span.className = 'md-input__code'; span.textContent = match[0]; fragment.append(span);
            offset = match.index! + match[0].length;
          }
          fragment.append(document.createTextNode(line.slice(offset)));
        }
        before += line;
      });
      position += node.text.length;
    } else {
      const tag = document.createElement('span');
      tag.className = 'md-input__mention'; tag.contentEditable = 'false';
      tag.dataset.mention = JSON.stringify(node);
      const label = document.createElement('span'); label.textContent = node.prefix + node.label; tag.append(label);
      if (editable) {
        const button = document.createElement('button'); button.type = 'button'; button.tabIndex = -1;
        button.setAttribute('aria-label', `删除 ${node.label}`); button.textContent = '×';
        const offset = position;
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => remove(offset)); tag.append(button);
      }
      fragment.append(tag); position++; before += '\ufffc';
    }
  }
  const tail = document.createElement('br'); tail.dataset.tail = ''; fragment.append(tail);
  root.replaceChildren(fragment);
}
