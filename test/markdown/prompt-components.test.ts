// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import MarkdownIt from 'markdown-it';
import { expect, it } from 'vitest';
import Render from '../../components/markdown-render/markdown-render.vue';

it('四份模型提示词的成对/自闭合组件示例遵循现有注册协议', () => {
  const Card = defineComponent({
    props: { userId: String },
    setup: (props, { slots }) => () => h('span', { class: 'prompt-card', 'data-id': props.userId }, slots.default?.()),
  });
  for (const language of ['zh-CN', 'en-US']) for (const version of ['simple', 'detailed']) {
    const file = resolve('docs/public/prompts', `render-${version}.${language}.md`);
    const prompt = readFileSync(file, 'utf8');
    const examples = new MarkdownIt().parse(prompt, {})
      .filter(token => token.type === 'fence' && token.info === 'text' && token.content.trim().startsWith('<user-card '));
    expect(examples, file).toHaveLength(2);
    for (const example of examples) {
      const source = example.content.trim();
      const registered = mount(Render, { props: { content: source, components: { 'user-card': Card } } });
      expect(registered.find('.prompt-card').attributes('data-id')).toBe('42');
      expect(registered.find('.prompt-card').text()).toBe(source.endsWith('/>') ? '' : language === 'zh-CN' ? '查看用户' : 'View user');
      registered.unmount();
      const unknown = mount(Render, { props: { content: source } });
      expect(unknown.find('.prompt-card').exists()).toBe(false);
      expect(unknown.text()).toBe(source);
      unknown.unmount();
    }
  }
});
