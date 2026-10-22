// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { h, defineComponent } from 'vue';
import { it, expect } from 'vitest';
import { renderNodes } from '../../components/markdown-render/nodes/render';
import type { MarkdownNode } from '../../use.lib/markdown/engine/types';

it('渲染协议的空值、安全 URL、组件默认插槽与提示边界', async () => {
  const Card = defineComponent({ setup: (_p, { slots }) => () => h('i', slots.default?.()) });
  const nodes: MarkdownNode[] = [
    { type: 'component', tag: 'card', value: 'slot', key: '1' },
    { type: 'component', tag: 'missing', value: 'fallback', key: '2' },
    { type: 'element', key: '3' },
    { type: 'element', tag: 'a', attrs: { href: 'javascript:evil', src: 'data:evil' }, key: '4' },
    ...['/relative', '#anchor', 'mailto:a@b.com', 'tel:123'].map((href, i): MarkdownNode => ({ type: 'element', tag: 'a', attrs: { href }, key: `a${i}` })),
    { type: 'element', tag: 'blockquote', key: '5' },
    { type: 'element', tag: 'blockquote', children: [{ type: 'element', tag: 'p', key: 'p', children: [{ type: 'text', key: 't' }] }], key: '6' },
    { type: 'element', tag: 'img', attrs: { src: '/x', alt: 'image' }, key: '7' },
    { type: 'code', key: '8' },
    { type: 'code', language: 'mermaid', key: '9' },
  ];
  const context = { props: { components: { card: Card } }, theme: 'light', headings: [], report: () => {} };
  const w = mount(defineComponent({ render: () => h('div', renderNodes(nodes, context)) }));
  expect(w.find('i').text()).toBe('slot'); expect(w.text()).toContain('fallback');
  expect(w.findAll('a')[0].attributes()).not.toHaveProperty('href');
  expect(w.findAll('a')[2].attributes('target')).toBeUndefined();
  expect(w.find('img').attributes('alt')).toBe('image');
  w.unmount();
  const bare = mount(defineComponent({ render: () => h('div', renderNodes([{ type: 'component', tag: 'absent', key: 'none' }], { ...context, props: {} })) }));
  expect(bare.text()).toBe(''); bare.unmount();
});
