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
    if (node.type === 'text' && typeof node.content === 'string' && node.content) {
      const last = result.nodes.at(-1);
      if (last?.type === 'text') last.content += node.content;
      else result.nodes.push({ type: 'text', content: node.content });
    } else if (node.type === 'mention' && node.content && typeof node.content.id === 'string' && typeof node.content.label === 'string') {
      try {
        const content: InputMentionNode['content'] = { id: node.content.id, label: node.content.label };
        if (typeof node.content.type === 'string') content.type = node.content.type;
        if (node.content.data && typeof node.content.data === 'object' && !Array.isArray(node.content.data)) content.data = JSON.parse(JSON.stringify(node.content.data));
        result.nodes.push({ type: 'mention', content });
      } catch { /* 无效引用不进入草稿。 */ }
    }
  }
  return result;
}
export function documentLength(doc: InputDocument): number {
  return doc.nodes.reduce((sum, node) => sum + (node.type === 'text' ? node.content.length : 1), 0);
}
export function sliceDocument(doc: InputDocument, start: number, end: number): InputDocument {
  const nodes: InputDocument['nodes'] = [];
  let position = 0;
  for (const node of doc.nodes) {
    const length = node.type === 'text' ? node.content.length : 1;
    if (position < end && position + length > start) {
      nodes.push(node.type === 'text' ? { type: 'text', content: node.content.slice(Math.max(0, start - position), end - position) } : node);
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
/** 发送文字保留 mention 的明确参数；data 不进入默认模型上下文。 */
export function exportInput(doc: InputDocument, serialize = (node: InputMentionNode) => {
  const { label, id, type } = node.content;
  return JSON.stringify({ label, id, type });
}): InputSubmit {
  const document = normalizeDocument(doc);
  return {
    document,
    text: document.nodes.map(node => node.type === 'text' ? node.content : serialize(node)).join(''),
    mentions: document.nodes.filter((node): node is InputMentionNode => node.type === 'mention'),
  };
}
