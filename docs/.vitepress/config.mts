import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'zh-CN',
  title: 'vmo-markdown-render',
  srcExclude: ['public/prompts/**'],
  markdown: { languageAlias: { audio: 'text', video: 'text' } },
  description: 'Vue 3 Markdown 渲染与聊天输入组件：npm 接入、完整 API 与用例',
  base: process.env.DOCS_BASE || '/',
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: `${process.env.DOCS_BASE || '/'}favicon.svg` }]],
  locales: {
    root: { label: '简体中文', lang: 'zh-CN' },
    en: {
      label: 'English', lang: 'en-US',
      description: 'Vue 3 Markdown rendering and chat input: npm integration, APIs, examples, and model prompts',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/getting-started' },
          { text: 'Input API', link: '/en/api/markdown-input' },
          { text: 'Render API', link: '/en/api/markdown-render' },
        ],
        sidebar: [
          { text: 'Get started', items: [{ text: 'Installation', link: '/en/guide/getting-started' }] },
          { text: 'Chat input', items: [
            { text: 'Data, sending, persistence', link: '/en/guide/input' },
            { text: 'Candidates and filtering', link: '/en/guide/input-mentions' },
            { text: 'Events and send keys', link: '/en/guide/input-events' },
            { text: 'Appearance, i18n, positioning', link: '/en/guide/input-configuration' },
            { text: 'Props, events, methods, slots', link: '/en/api/markdown-input' },
          ] },
          { text: 'Markdown rendering', items: [
            { text: 'Model protocol and prompts', link: '/en/guide/model-prompts' },
            { text: 'Configuration and API', link: '/en/api/markdown-render' },
            { text: 'Registered components', link: '/en/guide/components' },
            { text: 'Text rules', link: '/en/guide/text-rules' },
            { text: 'Markdown and streaming', link: '/en/guide/markdown' },
            { text: 'Themes', link: '/en/guide/theme' },
          ] },
          { text: 'Reference', items: [
            { text: 'Public types', link: '/en/api/types' },
            { text: 'CSS variables', link: '/en/markdown-styles' },
            { text: 'Testing and compatibility', link: '/en/guide/testing' },
          ] },
        ],
        outline: { level: [2, 3], label: 'On this page' },
        docFooter: { prev: 'Previous', next: 'Next' },
        langMenuLabel: 'Change language',
      },
    },
  },
  themeConfig: {
    nav: [
      { text: '使用指南', link: '/guide/getting-started' },
      { text: 'Input API', link: '/api/markdown-input' },
      { text: 'Render API', link: '/api/markdown-render' },
    ],
    sidebar: [
      { text: '使用指南', items: [
        { text: '安装与快速开始', link: '/guide/getting-started' },
      ] },
      { text: '聊天输入 Input', items: [
        { text: '数据、发送与草稿', link: '/guide/input' },
        { text: 'Mention 获取与过滤', link: '/guide/input-mentions' },
        { text: '事件、引用快捷键与发送热键', link: '/guide/input-events' },
        { text: '外观、文案与浮窗', link: '/guide/input-configuration' },
        { text: 'Props、事件、方法与插槽', link: '/api/markdown-input' },
      ] },
      { text: 'Markdown 渲染 Render', items: [
        { text: '模型协议与提示词', link: '/guide/model-prompts' },
        { text: '完整配置与 API', link: '/api/markdown-render' },
        { text: '组件注入', link: '/guide/components' },
        { text: '正则规则', link: '/guide/text-rules' },
        { text: 'Markdown 与流式渲染', link: '/guide/markdown' },
        { text: '主题与样式', link: '/guide/theme' },
      ] },
      { text: '参考', items: [
        { text: 'TypeScript 类型', link: '/api/types' },
        { text: 'CSS 变量', link: '/markdown-styles' },
        { text: '测试与兼容性', link: '/guide/testing' },
      ] },
      { text: '维护文档', collapsed: true, items: [
        { text: '架构', link: '/markdown-render-architecture' },
        { text: '需求', link: '/markdown-render-prd' },
        { text: 'Render 验证记录', link: '/markdown-render-validation' },
        { text: 'Input 验证记录', link: '/markdown-input-validation' },
      ] },
    ],
    search: { provider: 'local' },
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一页', next: '下一页' },
  },
});
