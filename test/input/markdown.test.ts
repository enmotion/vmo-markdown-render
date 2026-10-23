import { expect, it } from 'vitest';
import { inlineDecorations, linePrefix } from '../../components/markdown-input/markdown';
it('复用解析器识别星号强调与嵌套，保留原文偏移', () => {
  for (const [text, kind, start, end] of [
    ['这是 **重点**', 'strong', 3, 9], ['*强调*', 'em', 0, 4],
  ] as const) expect(inlineDecorations(text)).toEqual([expect.objectContaining({ kind, start, end })]);
  expect(inlineDecorations('***嵌套***').map(item => item.kind).sort()).toEqual(['em', 'strong']);
  expect(inlineDecorations('\\*普通* **未闭合')).toEqual([]);
  for (const text of ['`代码`', '__重点__', '_斜体_', '~~删除~~', '～～删除～～']) expect(inlineDecorations(text)).toEqual([]);
  expect(inlineDecorations('`**普通**`')).toEqual([expect.objectContaining({ kind: 'strong' })]);
  expect(inlineDecorations('a_b_c')).toEqual([]);
  expect(inlineDecorations('**重点*')).toEqual([]);
  expect(inlineDecorations('~~删除~')).toEqual([]);
});
it('只识别短横线无序列表和有序列表', () => {
  expect(linePrefix('12. 内容')).toMatchObject({ kind: 'ordered', marker: '12.', length: 4 });
  expect(linePrefix('- 内容')).toMatchObject({ kind: 'unordered' });
  expect(linePrefix('\\>引用')).toBeUndefined();
  for (const text of ['>引用', '> 引用', '+ 列表', '* 列表', '-\t列表', '-列表']) expect(linePrefix(text)).toBeUndefined();
  expect(linePrefix('正文 - 内容')).toBeUndefined();
});
