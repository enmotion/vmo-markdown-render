// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import MarkdownInput from '../../components/markdown-input/markdown-input.vue';
import { defaultInputCodec } from '../../components/markdown-input/codec';
import type { InputValue, InputTextCodec } from '../../components/markdown-input/types';

it('默认 getter/setter、v-model 使用节点数组；回写不重建节点', async () => {
  const wrapper = mount(MarkdownInput, { attachTo: document.body, props: { modelValue: '起始' } });
  try {
    const api = wrapper.vm as unknown as { setter(text: InputValue): void; getter(): InputValue; getText(): string; };
    const text = defaultInputCodec.encode({ version: 1, nodes: [{ type: 'mention', content: { type: 'knowledge', id: 'kb', label: '知识库' } }, { type: 'text', content: ' 总结' }] });
    api.setter(text);
    expect(api.getter()).toEqual(text);
    expect(api.getText()).toBe('{"label":"知识库","id":"kb","type":"knowledge"} 总结');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([text]);
    const tag = wrapper.get('[data-mention]').element;
    await wrapper.setProps({ modelValue: text });
    expect(wrapper.get('[data-mention]').element).toBe(tag);
    expect(wrapper.emitted('submit')).toBeUndefined();
    await wrapper.setProps({ modelValue: '外部 **文字**' });
    expect(wrapper.find('[data-mention]').exists()).toBe(false);
    expect(api.getText()).toBe('外部 **文字**');
  } finally { wrapper.unmount(); }
});
it('可替换编解码器，异常时报告并保留可读原文', async () => {
  const codec: InputTextCodec = {
    decode: text => ({ version: 1, nodes: [{ type: 'text', content: String(text).replace(/^custom:/, '') }] }),
    encode: doc => 'custom:' + doc.nodes.map(node => node.type === 'text' ? node.content : node.content.label).join(''),
  };
  const wrapper = mount(MarkdownInput, { props: { modelValue: 'custom:你好', getter: codec.encode, setter: codec.decode } });
  try {
    const api = wrapper.vm as unknown as { getter(): InputValue; getText(): string };
    expect(api.getter()).toBe('custom:你好'); expect(api.getText()).toBe('你好');
    await wrapper.setProps({ getter: () => { throw Error(); }, setter: () => { throw Error(); }, modelValue: '保留原文' });
    expect(api.getText()).toBe('保留原文'); expect(api.getter()).toEqual([{ type: 'text', content: '保留原文' }]);
    expect(wrapper.emitted('error')?.flat()).toEqual(expect.arrayContaining([expect.objectContaining({ stage: 'decode' }), expect.objectContaining({ stage: 'encode' })]));
  } finally { wrapper.unmount(); }
});
