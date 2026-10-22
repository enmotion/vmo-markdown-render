// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, inject, nextTick, onMounted, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import MarkdownRender from '../../components/markdown-render/markdown-render.vue';

describe('markdown-render', () => {
  it('默认不指定主题，显式 dark/light 控制实例 class 而不修改 html', async () => {
    const original = document.documentElement.className;
    const wrapper = mount(MarkdownRender, { props: { content: '正文' } });
    expect(wrapper.attributes('data-theme')).toBeUndefined();
    expect(wrapper.classes()).not.toContain('dark');
    await wrapper.setProps({ theme: 'dark' });
    expect(wrapper.classes()).toContain('dark');
    expect(wrapper.attributes('data-theme')).toBe('dark');
    expect(document.documentElement.className).toBe(original);
    await wrapper.setProps({ theme: 'light' });
    expect(wrapper.classes()).not.toContain('dark');
    await wrapper.setProps({ theme: '' });
    expect(wrapper.attributes('data-theme')).toBeUndefined();
    wrapper.unmount();
  });
  it('业务组件可以自行请求数据，追加不重复请求，清空后正常卸载', async () => {
    const request = vi.fn(async (id: string) => ({ name: `用户 ${id}` }));
    const Card = defineComponent({ props: ['userId'], setup(props) {
      const name = ref('加载中');
      onMounted(async () => { name.value = (await request(props.userId)).name; });
      return () => h('section', { class: 'request-card' }, name.value);
    } });
    const content = '<user-card user-id="42"></user-card>';
    const wrapper = mount(MarkdownRender, { props: { content, components: { 'user-card': Card } } });
    await flushPromises();
    expect(wrapper.find('.request-card').text()).toBe('用户 42');
    await wrapper.setProps({ content: content + '\n\n新增正文' });
    expect(request).toHaveBeenCalledTimes(1);
    await wrapper.setProps({ content: '' });
    expect(wrapper.find('.request-card').exists()).toBe(false);
    wrapper.unmount();
  });
  it('实例主题独立，链接事件允许宿主接管', async () => {
    const one = mount(MarkdownRender, { props: { content: '[链接](https://example.com)', theme: 'dark', fontBaseSize: 18 }, attrs: { onLinkClick: ({ event }: { event: MouseEvent }) => event.preventDefault() } });
    const two = mount(MarkdownRender, { props: { content: '# 标题', theme: 'light', fontBaseSize: 10 } });
    await one.find('a').trigger('click');
    expect(one.emitted('link-click')?.[0]?.[0]).toMatchObject({ href: 'https://example.com' });
    expect(one.attributes('data-theme')).toBe('dark');
    expect(two.attributes('data-theme')).toBe('light');
    expect(one.attributes('style')).toContain('18px');
    expect(two.attributes('style')).toContain('10px');
    one.unmount(); two.unmount();
  });

  it('渲染基础语法、目录、脚注与提示块，并隔离锚点', () => {
    const content = '# 标题\n\n[TOC]\n\n> [!WARNING]\n> 注意\n\n- [x] 已完成\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n正文[^a]\n\n[^a]: 脚注';
    const one = mount(MarkdownRender, { props: { content } });
    const two = mount(MarkdownRender, { props: { content } });
    expect(one.find('h1').text()).toBe('标题');
    expect(one.find('nav a').attributes('href')).toBe('#' + one.find('h1').attributes('id'));
    expect(one.find('h1').attributes('id')).not.toBe(two.find('h1').attributes('id'));
    expect(one.find('.md-alert-warning').text()).toContain('注意');
    expect(one.find('table').text()).toContain('1');
    expect(one.find('input').element.checked).toBe(true);
    expect(one.find('sup a').attributes('href')).toContain('-fn-0');
    one.unmount(); two.unmount();
  });
  it('只有完整组件才挂载；追加正文保持实例和业务上下文', async () => {
    let mounts = 0;
    const Card = defineComponent({ props: ['userId'], setup(props) {
      const context = inject('business');
      const count = ref(0);
      onMounted(() => mounts++);
      return () => h('button', { onClick: () => count.value++ }, `${props.userId}:${context}:${count.value}`);
    } });
    const wrapper = mount(MarkdownRender, { props: { content: '<user-card user-id="42">', streaming: true, components: { 'user-card': Card } }, global: { provide: { business: 'ok' } } });
    expect(mounts).toBe(0);
    await wrapper.setProps({ content: '<user-card user-id="42"></user-card>' });
    expect(mounts).toBe(1);
    await wrapper.find('button').trigger('click');
    await wrapper.setProps({ content: '<user-card user-id="42"></user-card>\n\n追加正文' });
    expect(wrapper.find('button').text()).toBe('42:ok:1');
    expect(mounts).toBe(1);
    wrapper.unmount();
  });
  it('规则只转换正文，结果为纯文本，代码和属性保持原样', async () => {
    const wrapper = mount(MarkdownRender, { props: {
      content: 'user:amy `user:amy` [user:amy](https://example.com/user:amy)\n\n```text\nuser:amy\n```',
      textRules: [{ pattern: /user:amy/g, replace: '<b>姓名</b>' }],
    } });
    await nextTick();
    expect(wrapper.find('b').exists()).toBe(false);
    expect(wrapper.find('p').text()).toContain('<b>姓名</b>');
    expect(wrapper.find('p code').text()).toBe('user:amy');
    expect(wrapper.find('a').attributes('href')).toContain('user:amy');
    expect(wrapper.find('pre').text()).toContain('user:amy');
    wrapper.unmount();
  });
  it('HTML 与未注册标签保持文本，不执行危险链接', () => {
    const wrapper = mount(MarkdownRender, { props: { content: '<script>alert(1)</script>\n\n<unknown-card></unknown-card>\n\n[x](javascript:alert(1))' } });
    expect(wrapper.find('script').exists()).toBe(false);
    expect(wrapper.find('unknown-card').exists()).toBe(false);
    expect(wrapper.text()).toContain('<unknown-card>');
    expect(wrapper.find('a').exists()).toBe(false);
    wrapper.unmount();
  });
  it('流结束与直接完整渲染一致，非法字号回退', async () => {
    const source = '# hi\n\n**bold**\n\n[a](https://example.com)';
    const wrapper = mount(MarkdownRender, { props: { streaming: true, fontBaseSize: -1 } });
    for (let i = 1; i <= source.length; i++) await wrapper.setProps({ content: source.slice(0, i) });
    await wrapper.setProps({ streaming: false });
    expect(wrapper.find('strong').text()).toBe('bold');
    expect(wrapper.find('a').attributes('href')).toBe('https://example.com');
    expect(wrapper.attributes('style')).toContain('--md-font-base-size: 12px');
    wrapper.unmount();
  });
});

describe('提示块标题', () => {
  it('默认英文、实例翻译和原文标题分别生效，更新翻译时响应', async () => {
    const content = '> [!IMPORTANT]\n> 正文\n\n> [!NOTE] 自定义标题 <script>\n> 内容';
    const one = mount(MarkdownRender, { props: { content, alertLabels: { IMPORTANT: '重点', NOTE: '备注' } } });
    const two = mount(MarkdownRender, { props: { content } });
    expect(one.find('.md-alert-title').text()).toBe('重点');
    expect(two.find('.md-alert-title').text()).toBe('Important');
    expect(one.findAll('.md-alert-title')[1].text()).toBe('自定义标题 <script>');
    expect(one.find('.md-alert-title script').exists()).toBe(false);
    expect(one.find('.md-alert-body').text()).toBe('正文');
    await one.setProps({ alertLabels: { IMPORTANT: 'Key information' } });
    expect(one.find('.md-alert-title').text()).toBe('Key information');
    one.unmount(); two.unmount();
  });
});

describe('正则渲染组件', () => {
  it('传递捕获组和事件，支持 VNode，且不转换代码与公式', async () => {
    const click = vi.fn();
    const Badge = defineComponent({ props: ['id'], setup: props => () => h('button', { class: 'order-badge', onClick: click }, `订单${props.id}`) });
    const wrapper = mount(MarkdownRender, { props: {
      content: 'ORDER-12 与 USER-amy\n\n`ORDER-99`\n\n```text\nORDER-88\n```\n\n$ORDER-77$',
      textRules: [
        { pattern: /ORDER-(\d+)/g, component: Badge, props: ({ captures }) => ({ id: captures[0] }) },
        { pattern: /USER-(\w+)/g, replace: ({ captures }) => h('span', { class: 'user-badge' }, captures[0]) },
        { pattern: /订单/g, replace: '不应递归' },
      ],
    } });
    expect(wrapper.findAll('.order-badge')).toHaveLength(1);
    expect(wrapper.find('.order-badge').text()).toBe('订单12');
    expect(wrapper.find('.user-badge').text()).toBe('amy');
    await wrapper.find('.order-badge').trigger('click');
    expect(click).toHaveBeenCalledOnce();
    expect(wrapper.find('p code').text()).toBe('ORDER-99');
    await wrapper.setProps({ content: 'ORDER-34' });
    expect(wrapper.find('.order-badge').text()).toBe('订单34');
    wrapper.unmount();
  });

  it('组件 props 回调失败时保留原文并报告', () => {
    const wrapper = mount(MarkdownRender, { props: {
      content: 'ORDER-12',
      textRules: [{ pattern: /ORDER-(\d+)/g, component: defineComponent({ render: () => h('span') }), props: () => { throw Error('private'); } }],
    } });
    expect(wrapper.text()).toBe('ORDER-12');
    expect(wrapper.emitted('error')?.[0][0]).toMatchObject({ stage: 'text-rule', ruleIndex: 0 });
    expect(JSON.stringify(wrapper.emitted('error'))).not.toContain('private');
    wrapper.unmount();
  });
});

it('themeColors 支持实例隔离、响应更新和移除覆盖', async () => {
  const one = mount(MarkdownRender, { props: { themeColors: { primary: '#112233', info: 'rgb(1, 2, 3)' } } });
  const two = mount(MarkdownRender);
  expect(one.attributes('style')).toContain('--md-primary: #112233');
  expect(one.attributes('style')).toContain('--md-info: rgb(1, 2, 3)');
  expect(two.attributes('style')).not.toContain('--md-primary');
  await one.setProps({ themeColors: { success: '#aabbcc88' } });
  expect(one.attributes('style')).not.toContain('--md-primary');
  expect(one.attributes('style')).toContain('--md-success: #aabbcc88');
  one.unmount(); two.unmount();
});
