import { afterEach, expect, it, vi } from 'vitest';
import MarkdownIt from 'markdown-it';
import { inlineDecorations } from '../../components/markdown-input/markdown';
afterEach(()=>vi.restoreAllMocks());
it('解析器空结果和未配对 token 不生成错误样式', () => {
  const spy=vi.spyOn(MarkdownIt.prototype,'parseInline');
  spy.mockReturnValue([]); expect(inlineDecorations('')).toEqual([]);
  const position={inputSource:{start:0,end:1}};
  spy.mockReturnValue([{children:[{nesting:-1,tag:'em',meta:position}]}] as never); expect(inlineDecorations('*')).toEqual([]);
  spy.mockReturnValue([{children:[{nesting:1,tag:'strong',meta:position},{nesting:-1,tag:'em',meta:position}]}] as never); expect(inlineDecorations('*')).toEqual([]);
});
