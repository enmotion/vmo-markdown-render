import { expect, it } from 'vitest';
import { defaultInputCodec as codec } from '../../components/markdown-input/codec';
import type { InputDocument } from '../../components/markdown-input/types';
const mention = { type: 'mention' as const, id: 'a}😀', prefix: '@', label: '同名 "知识库"', source: 'kb', data: { permissions: ['read'] } };
it('文本协议可逆，保留 Markdown、引用身份、Unicode 和相邻反斜线', () => {
  for (const text of ['# 标题\n**重点**', '\\*转义\\*', '{{mention:literal}}', '\\{{mention:x}}', '\\\\{{mention:x}}', '\\', '\\\\', '']) {
    const doc: InputDocument = { version: 1, nodes: [...(text ? [{ type: 'text' as const, text }] : []), mention, mention] };
    expect(codec.decode(codec.encode(doc))).toEqual(doc);
  }
});
it('无效协议原文保留，不产生可执行节点', () => {
  for (const text of ['普通 @名字', '{{mention:bad}}', '{{mention:%ZZ}}', '{{mention:%7B%7D}}', '{{mention:unclosed']) {
    expect(codec.decode(text)).toEqual({ version: 1, nodes: [{ type: 'text', text }] });
  }
});
