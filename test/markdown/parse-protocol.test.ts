import { it, expect, vi } from 'vitest';
import Token from 'markdown-it/lib/token.mjs';
const tokens = vi.hoisted(() => ({ value: [] as unknown[] }));
vi.mock('markdown-it', () => ({ default: class {
  inline = { ruler: { before() {} } }; block = { ruler: { before() {} } };
  use() { return this; } parse() { return tokens.value; }
} }));
import { createEngine } from '../../use.lib/markdown/engine/parse';

it('兼容解析器空子节点、孤立闭合和未知 token 的回退', () => {
  const make = (type: string, tag = '', nesting: -1 | 0 | 1 = 0) => new Token(type, tag, nesting);
  const image = make('image', 'img'); image.content = 'fallback alt';
  const heading = make('heading_open', 'h1', 1);
  const text = make('unknown'); text.content = 'unknown text';
  tokens.value = [make('orphan_close', '', -1), make('inline'), image, heading, make('heading_close', 'h1', -1), text, make('empty')];
  const result = createEngine(new Set(), 'test')('', false);
  expect(result.headings).toEqual([{ id: 'test-heading', level: 1, text: '' }]);
  expect(result.nodes.some(n => n.attrs?.alt === 'fallback alt')).toBe(true);
  expect(result.nodes.some(n => n.value === 'unknown text')).toBe(true);
});
