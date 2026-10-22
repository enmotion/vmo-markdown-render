import { describe, expect, it } from 'vitest';
import { createEngine } from '../../use.lib/markdown/engine/parse';
import type { MarkdownNode } from '../../use.lib/markdown/engine/types';
const flatten = (nodes: MarkdownNode[]): MarkdownNode[] => nodes.flatMap(node => [node, ...flatten(node.children ?? [])]);

describe('解析边界', () => {
  it('标题、嵌套列表、图片和重复锚点', () => {
    const parse = createEngine(new Set(), 'test');
    const result = parse('# A\n\n# A\n\n- one\n  - two\n\n![alt](https://example.com/a.png)', false);
    expect(result.headings.map(h => h.id)).toEqual(['test-a', 'test-a-1']);
    expect(flatten(result.nodes).filter(n => n.tag === 'ul')).toHaveLength(2);
    expect(flatten(result.nodes).find(n => n.tag === 'img')?.attrs?.alt).toBe('alt');
  });
  it('公式不会触发正文规则，货币不错误识别', () => {
    const parse = createEngine(new Set(), 'test');
    const nodes = flatten(parse('货币 $5 and $10。公式 $x^2$\n\n$$\nx+y\n$$', false).nodes);
    expect(nodes.filter(n => n.type === 'math').map(n => n.value)).toEqual(['x^2', 'x+y']);
  });
  it('不补全业务标签，但补全围栏和强调，结束时还原原文语义', () => {
    const parse = createEngine(new Set(['user-card']), 'test');
    expect(flatten(parse('<user-card id="1">', true).nodes).some(n => n.type === 'component')).toBe(false);
    expect(flatten(parse('**hello', true).nodes).some(n => n.tag === 'strong')).toBe(true);
    expect(flatten(parse('**hello', false).nodes).some(n => n.tag === 'strong')).toBe(false);
    expect(flatten(parse('```js\nconst x=1', true).nodes).some(n => n.type === 'code')).toBe(true);
  });
  it('自闭合标签支持字符串数据属性，剔除事件与危险属性', () => {
    const parse = createEngine(new Set(['user-card']), 'test');
    const component = flatten(parse('<user-card id="1" onclick="evil" style="evil" />', false).nodes).find(n => n.type === 'component');
    expect(component?.attrs).toEqual({ id: '1' });
  });
});
