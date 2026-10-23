import { normalizeDocument } from './document';
import type { InputTextCodec, InputValueNode } from './types';

/** 默认转换无转义或编码；data 属于内部业务信息，不进入默认输出。 */
export const defaultInputCodec: InputTextCodec = {
  encode(document) {
    return normalizeDocument(document).nodes.map((node): InputValueNode => {
      if (node.type === 'text') return { type: 'text', content: node.content };
      const { label, id, type } = node.content;
      return type === undefined ? { label, id } : { label, id, type };
    });
  },
  decode(value) {
    if (typeof value === 'string') return normalizeDocument({ version: 1, nodes: [{ type: 'text', content: value }] });
    if (!Array.isArray(value)) throw new TypeError('输入值必须是节点数组或字符串');
    return normalizeDocument({ version: 1, nodes: value.map(node => {
      if (node && 'content' in node && node.type === 'text' && typeof node.content === 'string') return node;
      return { type: 'mention', content: node };
    }) });
  },
};
