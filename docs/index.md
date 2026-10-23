---
layout: home
hero:
  name: vmo-markdown-render
  text: Vue 3 Markdown 渲染与聊天输入
  tagline: npm 接入、完整 API、可交互示例与中英文模型提示词
  actions:
    - theme: brand
      text: 安装与快速开始
      link: /guide/getting-started
    - theme: alt
      text: Mention 获取与过滤
      link: /guide/input-mentions
features:
  - title: 聊天输入
    details: 多分类 mention、默认节点数组、参数 JSON 发送文字；发送行为由宿主控制。
    link: /guide/input
  - title: 候选与搜索
    details: 同步和异步获取，默认/自定义本地过滤与远端过滤，完整请求状态处理示例。
    link: /guide/input-mentions
  - title: Markdown 渲染
    details: 流式内容、业务组件、代码高亮、公式、Mermaid 与实例主题。
    link: /api/markdown-render
---

## 接入入口

[English documentation](./en/)

- [模型输出协议与提示词（中英文简版/详细版）](./guide/model-prompts)

- [Input 全部属性、事件、插槽与方法](./api/markdown-input)
- [Input 主题、文案与移动浮窗](./guide/input-configuration)
- [公共类型及默认转换工具](./api/types)

示例均从 `vmo-markdown-render` 包入口导入，独立源码位于 docs/examples，并经过发布声明类型检查。
