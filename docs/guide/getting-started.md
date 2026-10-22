# 安装与使用

## 获取组件

需要 Vue `^3.3.4`。当前仓库版本是 `0.0.0-beta.0`，且 `private: true`，尚不能据此假设 npm 公共仓库存在可安装版本。可以先在源码仓库构建并打包：

```sh
npm install
npm run build
npm pack
```

在消费项目安装生成的压缩包（路径按实际位置调整）：

```sh
npm install vue@^3.3.4
npm install /path/to/vmo-markdown-render-0.0.0-beta.0.tgz
```

将来发布到可访问的 npm registry 后，可使用 `npm install vmo-markdown-render`。构建产物提供 ESM、CommonJS 和 TypeScript 声明。

## 最小示例

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownRender } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
// 需要公式时额外加载 KaTeX 样式与字体。
import 'vmo-markdown-render/math.css';

const content = ref('# 你好\n\n这是一段 **Markdown**。');
</script>

<template>
  <MarkdownRender :content="content" theme="auto" :font-base-size="16" />
</template>
```

`<script setup>` 中导入后即可使用。也可在应用入口通过 `app.component('MarkdownRender', MarkdownRender)` 全局注册；本库没有 `app.use()` 安装插件。

## 文档开发

在仓库根目录运行：

```sh
npm run docs:dev
npm run docs:build
npm run docs:preview
```

静态产物位于 `docs/.vitepress/dist`。部署到子路径时设置环境变量，例如 `DOCS_BASE=/vmo-markdown-render/ npm run docs:build`。站点采用 [VitePress 官方目录与脚本约定](https://vitepress.dev/zh/guide/getting-started)。
