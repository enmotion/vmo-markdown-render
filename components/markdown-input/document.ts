import type { InputDocument, InputMentionNode, InputSubmit } from './types';

export const emptyDocument = (): InputDocument => ({ version: 1, nodes: [] });
/** 过滤外部/剪贴板的无效节点，合并相邻文字；不从纯文字推断 mention。 */
export function normalizeDocument(value: unknown): InputDocument {
  const result = emptyDocument();
  if (!value || typeof value !== 'object') return result;
  const source = value as InputDocument;
  if (source.version !== 1 || !Array.isArray(source.nodes)) return result;
  for (const node of source.nodes) {
    if (!node || typeof node !== 'object') continue;
    if (node.type === 'text' && typeof node.text === 'string' && node.text) {
      const last = result.nodes.at(-1);
      if (last?.type === 'text') last.text += node.text;
      else result.nodes.push({ type: 'text', text: node.text });
    } else if (node.type === 'mention' && typeof node.id === 'string' && typeof node.label === 'string' && typeof node.prefix === 'string') {
      // JSON 克隆既隔离宿主对象，也拒绝函数、循环引用等非持久化数据。
      try {
        const copy: InputMentionNode = { type: 'mention', id: node.id, label: node.label, prefix: node.prefix };
        if (typeof node.source === 'string') copy.source = node.source;
        if (typeof node.kind === 'string') copy.kind = node.kind;
        if (node.data && typeof node.data === 'object' && !Array.isArray(node.data)) copy.data = JSON.parse(JSON.stringify(node.data));
        result.nodes.push(copy);
      } catch { /* 无效引用不进入草稿。 */ }
    }
  }
  return result;
}
export function documentLength(doc: InputDocument): number {
  return doc.nodes.reduce((sum, node) => sum + (node.type === 'text' ? node.text.length : 1), 0);
}
export function sliceDocument(doc: InputDocument, start: number, end: number): InputDocument {
  const nodes: InputDocument['nodes'] = [];
  let position = 0;
  for (const node of doc.nodes) {
    const length = node.type === 'text' ? node.text.length : 1;
    if (position < end && position + length > start) {
      nodes.push(node.type === 'text' ? { type: 'text', text: node.text.slice(Math.max(0, start - position), end - position) } : node);
    }
    position += length;
  }
  return normalizeDocument({ version: 1, nodes });
}
export function replaceDocument(doc: InputDocument, start: number, end: number, inserted: InputDocument): InputDocument {
  return normalizeDocument({ version: 1, nodes: [
    ...sliceDocument(doc, 0, start).nodes, ...inserted.nodes,
    ...sliceDocument(doc, end, documentLength(doc)).nodes,
  ] });
}
export function exportInput(doc: InputDocument, serialize = (node: InputMentionNode) => node.prefix + node.label): InputSubmit {
  const document = normalizeDocument(doc);
  return {
    document,
    text: document.nodes.map(node => node.type === 'text' ? node.text : serialize(node)).join(''),
    mentions: document.nodes.filter((node): node is InputMentionNode => node.type === 'mention'),
  };
}
