import { defaultInputI18n, formatInputLabel } from './i18n';
import { inlineDecorations, linePrefix } from './markdown';
import type { InputDocument, InputMentionNode, InputI18n } from './types';

function mentionTag(node: InputMentionNode, position: number, remove: (index: number) => void, editable: boolean, i18n: InputI18n) {
  const tag = document.createElement('span'); tag.className = 'md-input__mention'; tag.contentEditable = 'false';
  tag.dataset.mention = JSON.stringify(node);
  const label = document.createElement('span'); label.textContent = node.content.label; tag.append(label);
  if (editable) {
    const button = document.createElement('button'); button.type = 'button'; button.tabIndex = -1;
    button.setAttribute('aria-label', formatInputLabel(i18n.removeMention, node.content.label)); button.textContent = '×';
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => remove(position)); tag.append(button);
  }
  return tag;
}
/** DOM 始终保留所有源码字符；隐藏标记仅属于显示，不改变选区偏移或文档内容。 */
export function paintDocument(root: HTMLElement, doc: InputDocument, remove: (index: number) => void, editable: boolean, i18n: InputI18n = defaultInputI18n) {
  const mentions = new Map<number, InputMentionNode>();
  let source = '';
  for (const node of doc.nodes) {
    if (node.type === 'text') source += node.content;
    else { mentions.set(source.length, node); source += '\ufffc'; }
  }
  const fragment = document.createDocumentFragment();
  let position = 0;
  source.split('\n').forEach((text, index, lines) => {
    const line = document.createElement('span'); line.className = 'md-input__line';
    line.dataset.start = String(position); line.dataset.end = String(position + text.length);
    const decorations = inlineDecorations(text);
    const prefix = linePrefix(text);
    if (prefix) { line.dataset.block = prefix.kind; line.dataset.marker = prefix.kind === 'unordered' ? '•' : prefix.marker; }
    const markers = decorations.flatMap(item => item.markers);
    if (prefix) markers.push([0, prefix.length]);
    const boundaries = new Set([0, text.length, ...decorations.flatMap(item => [item.start, item.end]), ...markers.flat()]);
    for (let offset = 0; offset < text.length; offset++) if (mentions.has(position + offset)) { boundaries.add(offset); boundaries.add(offset + 1); }
    const points = [...boundaries].sort((a, b) => a - b);
    for (let part = 0; part < points.length - 1; part++) {
      const start = points[part]; const end = points[part + 1];
      const mention = mentions.get(position + start);
      if (mention) { line.append(mentionTag(mention, position + start, remove, editable, i18n)); continue; }
      const span = document.createElement('span'); span.textContent = text.slice(start, end);
      for (const decoration of decorations) if (start >= decoration.start && end <= decoration.end) span.classList.add(`md-input__${decoration.kind}`);
      if (markers.some(([left, right]) => start >= left && end <= right)) span.classList.add('md-input__syntax');
      line.append(span);
      if (span.classList.contains('md-input__syntax')) line.append(document.createTextNode(''));
    }
    line.append(document.createTextNode(''));
    if (!text) { line.append(document.createTextNode('')); const tail = document.createElement('br'); tail.dataset.tail = ''; line.append(tail); }
    fragment.append(line);
    if (index < lines.length - 1) { const br = document.createElement('br'); br.className = 'md-input__break'; fragment.append(br); }
    position += text.length + 1;
  });
  root.replaceChildren(fragment);
}
