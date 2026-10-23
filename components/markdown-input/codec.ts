import { normalizeDocument } from './document';
import type { InputDocument, InputTextCodec } from './types';

/** 可逆文本协议。保留普通 Markdown；仅转义保留标记与其前方连续反斜线。 */
export const defaultInputCodec: InputTextCodec = {
  encode(document) {
    const nodes = normalizeDocument(document).nodes;
    return nodes.map((node, index) => node.type === 'text'
      ? node.text.replace(/(\\*)\{\{mention:/g, (_match, slashes: string) => '\\'.repeat(slashes.length * 2 + 1) + '{{mention:').replace(/\\+$/, slashes => nodes[index + 1]?.type === 'mention' ? slashes.repeat(2) : slashes)
      : `{{mention:${encodeURIComponent(JSON.stringify(node))}}}`).join('');
  },
  decode(text) {
    const nodes: InputDocument['nodes'] = [];
    const pattern = /(\\*)\{\{mention:/g;
    let offset = 0;
    for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
      nodes.push({ type: 'text', text: text.slice(offset, match.index) + '\\'.repeat(Math.floor(match[1].length / 2)) });
      if (match[1].length % 2) {
        nodes.push({ type: 'text', text: '{{mention:' }); offset = pattern.lastIndex; continue;
      }
      const end = text.indexOf('}}', pattern.lastIndex);
      let valid = false;
      if (end >= 0) {
        try {
          const node = JSON.parse(decodeURIComponent(text.slice(pattern.lastIndex, end)));
          const decoded = normalizeDocument({ version: 1, nodes: [node] });
          if (decoded.nodes.length === 1 && decoded.nodes[0].type === 'mention') {
            nodes.push(decoded.nodes[0]); valid = true; offset = end + 2; pattern.lastIndex = offset;
          }
        } catch { /* 无效标记保留文字，不创建渲染节点。 */ }
      }
      if (!valid) {
        // 无效候选整体消费，避免嵌套保留标记使重复扫描退化。
        const finish = end < 0 ? text.length : end + 2;
        nodes.push({ type: 'text', text: text.slice(match.index + match[1].length, finish) });
        offset = finish; pattern.lastIndex = finish;
      }
    }
    nodes.push({ type: 'text', text: text.slice(offset) });
    return normalizeDocument({ version: 1, nodes });
  },
};
