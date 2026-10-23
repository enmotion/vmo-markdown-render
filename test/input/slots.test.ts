// @vitest-environment happy-dom
import { h } from 'vue';
import { expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import MarkdownInput from '../../components/markdown-input/markdown-input.vue';

it('仅提供输入区，不渲染宿主工具栏、添加或发送插槽', () => {
  const wrapper = mount(MarkdownInput, { slots: {
    add: () => h('button', '添加'), actions: () => h('button', '发送'), footer: () => h('div', '旧底部区域'),
  } });
  try {
    expect(wrapper.findAll('[role="textbox"]')).toHaveLength(1);
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('旧底部区域');
    expect(wrapper.find('.md-input__toolbar').exists()).toBe(false);
  } finally { wrapper.unmount(); }
});
it('Enter 默认换行，宿主可拦截事件；组件没有发送方法', async () => {
  const wrapper = mount(MarkdownInput, { attachTo: document.body, props: { modelValue: '文字' } });
  try {
    const editor = wrapper.get('[role="textbox"]');
    (editor.element as HTMLElement).focus();
    await editor.trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('enter')?.[0]?.[1]).toEqual({ inCode: false });
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['文字\n']);
    expect((wrapper.vm as unknown as { submit?: unknown }).submit).toBeUndefined();
    expect(wrapper.emitted('submit')).toBeUndefined();
  } finally { wrapper.unmount(); }
  const controlled = mount(MarkdownInput, { props: { modelValue: '宿主发送', onEnter: (event: KeyboardEvent) => event.preventDefault() } });
  try {
    await controlled.get('[role="textbox"]').trigger('keydown', { key: 'Enter' });
    expect(controlled.emitted('update:modelValue')).toBeUndefined();
  } finally { controlled.unmount(); }
});
