// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import MarkdownInput from '../../components/markdown-input/markdown-input.vue';

it('关闭文字过滤也只展示当前分类，未分类和其他分类候选不泄漏', async () => {
  const wrapper = mount(MarkdownInput, { attachTo: document.body, props: {
    mentionShortcuts: [{ source: 'knowledge', keys: { ctrl: true, key: 'k' } }, { source: 'member', keys: { ctrl: true, key: 'u' } }],
    filterOption: false,
    options: [
      { source: 'knowledge', value: 'kb', label: '知识库' },
      { source: 'member', value: 'u', label: '成员' },
      { value: 'other', label: '未分类' },
    ],
  } });
  try {
    const editor = wrapper.get('[role="textbox"]');
    (editor.element as HTMLElement).focus();
    await editor.trigger('keydown', { key: 'k', ctrlKey: true }); await nextTick();
    expect(wrapper.findAll('[role="option"]').map(node => node.text())).toEqual(['知识库']);
    expect(wrapper.emitted('search')?.[0]?.[0]).toMatchObject({ source: 'knowledge', query: '' });
    await editor.trigger('keydown', { key: 'u', ctrlKey: true }); await nextTick();
    expect(wrapper.findAll('[role="option"]').map(node => node.text())).toEqual(['成员']);
  } finally { wrapper.unmount(); }
});
