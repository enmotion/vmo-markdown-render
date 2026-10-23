import { expect, it } from 'vitest';
import { defaultInputCodec as codec } from '../../components/markdown-input/codec';
import type { InputDocument } from '../../components/markdown-input/types';
it('默认 getter 输出数组，仅提取 mention label/id/type，不编码内容', () => {
  const doc: InputDocument = { version: 1, nodes: [
    { type: 'text', content: '原文 {{mention:%ZZ}} \\ 😀' },
    { type: 'mention', content: { id: 'a"😀', label: '<img src=x>', type: 'kb', data: { private: true } } },
    { type: 'mention', content: { id: 'b', label: '无分类' } },
  ] };
  const value = codec.encode(doc);
  expect(value).toEqual([
    { type: 'text', content: '原文 {{mention:%ZZ}} \\ 😀' },
    { id: 'a"😀', label: '<img src=x>', type: 'kb' },
    { id: 'b', label: '无分类' },
  ]);
  const restored = codec.decode(value);
  expect(restored.nodes[1]).toEqual({ type: 'mention', content: { id: 'a"😀', label: '<img src=x>', type: 'kb' } });
  expect(codec.encode(restored)).toEqual(value);
  if (Array.isArray(value) && 'label' in value[1]) value[1].label = '外部修改';
  expect(doc.nodes[1]).toMatchObject({ content: { label: '<img src=x>' } });
});
it('普通字符串不推断标签；setter 校验节点，支持可选分类和 text 同名业务分类', () => {
  const text = '{{mention:bad}} @名字';
  expect(codec.decode(text)).toEqual({ version: 1, nodes: [{ type: 'text', content: text }] });
  expect(codec.decode([{ id: 'a', label: 'A', type: 'text' }, { id: 'b', label: 'B' }]).nodes).toEqual([
    { type: 'mention', content: { id: 'a', label: 'A', type: 'text' } },
    { type: 'mention', content: { id: 'b', label: 'B' } },
  ]);
  expect(codec.decode([null, { label: '无 id' }] as never).nodes).toEqual([]);
});
