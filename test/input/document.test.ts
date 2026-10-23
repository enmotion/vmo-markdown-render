import { describe, expect, it } from 'vitest';
import { exportInput, normalizeDocument, replaceDocument, sliceDocument } from '../../components/markdown-input/document';
import type { InputDocument } from '../../components/markdown-input/types';
const draft: InputDocument = { version: 1, nodes: [
  { type: 'text', content: '参考 ' },
  { type: 'mention', content: { type: 'kb', id: 'kb-1', label: '知识库', data: { scope: ['read'] } } },
  { type: 'text', content: ' 总结' },
] };
describe('输入草稿协议', () => {
  it('JSON 恢复保留身份；导出文字独立于身份', () => {
    const restored = normalizeDocument(JSON.parse(JSON.stringify(draft)));
    expect(restored).toEqual(draft);
    expect(exportInput(restored).text).toBe('参考 知识库 总结');
    expect(exportInput(restored, node => `[${node.content.type}:${node.content.id}]`).text).toBe('参考 [kb:kb-1] 总结');
    expect(exportInput(restored).mentions[0].content.id).toBe('kb-1');
    restored.nodes[0] = { type: 'text', content: '修改' };
    expect(draft.nodes[0]).toEqual({ type: 'text', content: '参考 ' });
  });
  it('跨节点选择、删除和替换按原子引用计数', () => {
    expect(sliceDocument(draft, 3, 4).nodes).toEqual([draft.nodes[1]]);
    expect(exportInput(replaceDocument(draft, 3, 5, { version: 1, nodes: [] })).text).toBe('参考 总结');
    expect(normalizeDocument({ version: 2, nodes: draft.nodes }).nodes).toEqual([]);
    expect(normalizeDocument({ version: 1, nodes: [{ type: 'text', content: '@知识库' }] }).nodes[0].type).toBe('text');
  });
});
