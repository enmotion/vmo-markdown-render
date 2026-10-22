// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { vi, it, expect } from 'vitest';
const control = vi.hoisted(() => ({ fail: false }));
vi.mock('../../use.lib/markdown/engine/parse', async importOriginal => {
  const original = await importOriginal<typeof import('../../use.lib/markdown/engine/parse')>();
  return { createEngine: (...args: Parameters<typeof original.createEngine>) => {
    const engine = original.createEngine(...args);
    return (...input: Parameters<typeof engine>) => { if (control.fail) throw Error('private'); return engine(...input); };
  } };
});
import MarkdownRender from '../../components/markdown-render/markdown-render.vue';

it('解析失败保留原文，业务组件失败报告且不向上传播', async () => {
  control.fail = true;
  const failed = mount(MarkdownRender, { props: { content: 'raw' } });
  expect(failed.text()).toBe('raw'); expect(failed.emitted('error')?.[0][0]).toMatchObject({ stage: 'parse' });
  failed.unmount(); control.fail = false;
  const Broken = defineComponent({ render() { throw Error('component'); } });
  const w = mount(MarkdownRender, { props: { content: '<broken-card/>', components: { 'broken-card': Broken } }, global: { config: { warnHandler: () => {} } } });
  expect(w.emitted('error')?.[0][0]).toMatchObject({ stage: 'component' });
  w.unmount();
});
it('点击无 href 的锚点仍发出可接管事件', async () => {
  const w = mount(MarkdownRender, { props: { content: 'text' } });
  const a = document.createElement('a'); w.element.append(a);
  a.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(w.emitted('link-click')?.[0][0]).toMatchObject({ href: '' });
  w.unmount();
});
