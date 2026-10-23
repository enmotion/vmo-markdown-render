# 安装与快速开始

## 安装 npm 包

```bash
npm install vmo-markdown-render
```

宿主需要 Vue `^3.3.4`。包提供 ESM、CommonJS 与 TypeScript 声明。按组件具名导入即可，不提供 `app.use()` 插件。

在应用入口加载样式一次：

```ts
import 'vmo-markdown-render/style.css';
// 使用数学公式时额外导入；不使用公式可省略。
import 'vmo-markdown-render/math.css';
```

## 渲染 Markdown

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownRender } from 'vmo-markdown-render';
const content = ref('# 你好\n\n这是一段 **Markdown**。');
</script>
<template><MarkdownRender :content="content" theme="auto" :font-base-size="16" /></template>
```

更多能力见 [Render 完整用例](../api/markdown-render#完整配置与事件用例)、[流式与语法](./markdown)、[组件注入](./components)。

## 接入聊天输入

下面是一个完整宿主：包含同步候选、发送策略、节点保存恢复、全部 Input 事件和候选插槽。可直接点击按钮试用。

<script setup>
import InputChat from '../examples/InputChat.vue';
</script>

<ClientOnly><InputChat /></ClientOnly>

::: details 完整 Vue 文件
<<< ../examples/InputChat.vue
:::

示例共享数据与触发配置见 [mention 数据文件](./input-mentions#共享数据与触发配置)，将 `InputChat.vue` 与 `input-data.ts` 放在同一目录即可使用。请求、发送按钮、工具栏与附件由宿主负责。

## 选择接入方式

| 需求 | 阅读位置 |
| --- | --- |
| 默认节点数组、发送 JSON 参数文字、草稿恢复 | [Input 数据与发送](./input) |
| 同步候选、自定义过滤、异步请求与远端过滤 | [Mention 候选与过滤](./input-mentions) |
| 主题、字号、禁用、文案、移动浮窗 | [Input 配置](./input-configuration) |
| 每个 prop、emit、实例方法与插槽签名 | [Input API](../api/markdown-input) |
| 导入类型和默认转换工具 | [公共类型](../api/types) |

## 使用本地打包产物

在发布前验证消费方式时，在源码仓库执行：

```bash
npm install
npm run build
npm pack
```

然后在消费项目安装生成的文件（版本与路径按实际输出调整）：

```bash
npm install /path/to/vmo-markdown-render-0.0.1.tgz
```

## 构建文档站

在源码仓库先 `npm run build`，再执行 `npm run docs:check`、`npm run docs:dev` 或 `npm run docs:build`。示例按包入口解析构建后的 `dist`，不依赖内部源码路径。静态站点输出为 `docs/.vitepress/dist`，部署子路径可设置 `DOCS_BASE=/vmo-markdown-render/ npm run docs:build`。
