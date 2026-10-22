import MarkdownIt from 'markdown-it';
import { describe, it, expect } from 'vitest';
import { installExtensions, parseComponentAttrs } from '../../use.lib/markdown/engine/extensions';

describe('扩展边界与静默探测', () => {
  it('单引号、空属性、转义美元、未闭合与单行公式', () => {
    expect(parseComponentAttrs("id='42' title=\"\" v-if='x' onload='bad' style='x' is='x' ref='x' key='x' innerhtml='x'")).toEqual({ id: '42', title: '' });
    const md = new MarkdownIt(); installExtensions(md, new Set(['x-card']));
    expect(md.parseInline('<x-card/>', {})[0].children?.[0].type).toBe('business_component');
    expect(md.parseInline('$a\\$b$', {})[0].children?.[0].content).toBe('a\\$b');
    expect(md.parseInline('$x $', {})[0].children?.some(t => t.type === 'math_inline')).toBe(false);
    expect(md.parseInline('$x', {})[0].children?.some(t => t.type === 'math_inline')).toBe(false);
    expect(md.parse('$$x+y$$', {})[0].content).toBe('x+y');
    expect(md.parse('$$x\ny', {})[0].type).toBe('paragraph_open');
    expect(md.parse('$$x\ny\nz$$ trailing', {})[0].content).toBe('x\ny\nz');
  });
  it('规则在 silent 模式不产生 token，仍推进位置', () => {
    const inline: Record<string, Function> = {}; let block!: Function;
    installExtensions({ inline: { ruler: { before: (_anchor: string, name: string, callback: Function) => { inline[name] = callback; } } }, block: { ruler: { before: (_a: string, _n: string, callback: Function) => { block = callback; } } } } as unknown as MarkdownIt, new Set(['x-card']));
    for (const [name, src] of [['business_component', '<x-card/>'], ['inline_math', '$x$']]) {
      const state = { src, pos: 0, push: () => { throw Error('silent must not push'); } };
      expect(inline[name](state, true)).toBe(true); expect(state.pos).toBe(src.length);
    }
    expect(inline.inline_math({ src: '$', pos: 0 }, false)).toBe(false);
    const state = { src: '$$x$$', bMarks: [0], tShift: [0], eMarks: [5], line: 0, push: () => { throw Error('silent must not push'); } };
    expect(block(state, 0, 1, true)).toBe(true); expect(state.line).toBe(1);
  });
});
