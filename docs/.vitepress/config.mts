import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'zh-CN',
  title: 'Markdown Render',
  description: 'Vue 3 Markdown 渲染组件使用文档',
  base: process.env.DOCS_BASE || '/',
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: `${process.env.DOCS_BASE || '/'}favicon.svg` }]],
  themeConfig: {
    nav: [
      { text: '使用指南', link: '/guide/getting-started' },
      { text: 'API', link: '/api/markdown-render' },
    ],
    sidebar: [
      { text: '使用指南', items: [
        { text: '安装与使用', link: '/guide/getting-started' },
        { text: '组件注入', link: '/guide/components' },
        { text: '正则规则', link: '/guide/text-rules' },
        { text: 'Markdown 与流式渲染', link: '/guide/markdown' },
        { text: '主题与样式', link: '/guide/theme' },
      ] },
      { text: '参考', items: [
        { text: 'Props、事件与实例 API', link: '/api/markdown-render' },
        { text: '聊天输入组件', link: '/api/markdown-input' },
        { text: 'TypeScript 类型', link: '/api/types' },
        { text: 'CSS 变量', link: '/markdown-styles' },
      ] },
      { text: '维护文档', collapsed: true, items: [
        { text: '架构', link: '/markdown-render-architecture' },
        { text: '需求', link: '/markdown-render-prd' },
        { text: '验证记录', link: '/markdown-render-validation' },
      ] },
    ],
    search: { provider: 'local' },
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一页', next: '下一页' },
  },
});
