# MarkdownRender API

## Props

模板中使用 kebab-case，例如 `:text-rules="rules"`；TypeScript 中使用 camelCase。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| content | `string` | `''` | 当前累计完整 Markdown，不是增量分片 |
| baseUrl | `string` | `undefined` | 资源基础绝对 URL；目录地址以 `/` 结尾 |
| resolveUrl | `ResourceUrlResolver` | `undefined` | 同步转换图片、音频、视频 URL，不处理普通链接 |
| streaming | `boolean` | `false` | 生成期间进行语法补全；结束后设为 false，按原文解析 |
| theme | `'' | 'light' | 'dark' | 'auto'` | `''` | 空值跟随宿主祖先 `.dark`；auto 跟随系统 |
| themeColors | `ThemeColors` | `undefined` | 实例级 primary、warning、info、danger、success 配色 |
| fontBaseSize | `number` | `12` | px；非正数、NaN、Infinity 回退为 12 |
| components | `Record<string, Component>` | `{}` | 小写 kebab-case 标签映射；各实例独立 |
| textRules | `readonly TextRule[]` | `[]` | 正文正则转换，支持文本、VNode 与组件输出 |
| alertLabels | `Readonly<Record<string, string>>` | `undefined` | 大写提示类型到标题的翻译，Markdown 自定义标题优先 |
| unstyled | `boolean` | `false` | 不添加 `md-styled`，移除默认排版主题，保留语义结构与功能 |

映射与数组的默认值按实例创建。类型详情见 [TypeScript 类型](./types)。

## Emits

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| error | `MarkdownError` | 解析、规则、增强渲染、业务组件或复制发生错误时 |
| headings-change | `MarkdownHeading[]` | 首次解析立即触发，以及解析后的标题数组更新时；可为空数组 |
| link-click | `{ href: string; event: MouseEvent }` | 根容器捕获到冒泡的链接点击时，包含目录及注入组件中的链接 |

`headings-change` 不保证只在标题文本变化时触发。`href` 是链接属性原值，不一定是绝对 URL。事件不会自动阻止导航；非锚点的内置链接默认添加 `target="_blank"` 与 `rel="noopener noreferrer"`。

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownRender, type MarkdownError, type MarkdownHeading } from 'vmo-markdown-render';

const headings = ref<MarkdownHeading[]>([]);
function onError(error: MarkdownError) {
  console.warn(error.stage, error.message, error.ruleIndex);
}
function onLinkClick({ href, event }: { href: string; event: MouseEvent }) {
  if (href.startsWith('/app/')) {
    event.preventDefault();
    // 在此调用业务路由，例如 router.push(href)。
  }
}
</script>

<template>
  <MarkdownRender
    content="# 示例"
    @error="onError"
    @headings-change="headings = $event"
    @link-click="onLinkClick"
  />
</template>
```

## 对外暴露的属性与方法

当前组件未调用 `defineExpose`，**没有公开的自定义实例属性或方法**。内部的 `root`、`document`、`engine`、`theme`、`effectiveTheme` 均不属于公共 API；没有 `render()`、`refresh()` 或 `getHeadings()` 方法。

更新内容、主题和规则应修改 props；获取标题应监听 `headings-change`。需要滚动或测量时，推荐在宿主添加自己的容器 ref：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownRender } from 'vmo-markdown-render';
const container = ref<HTMLDivElement>();
function scrollToTop() {
  container.value?.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<template>
  <button @click="scrollToTop">回到顶部</button>
  <div ref="container" style="max-height: 400px; overflow: auto">
    <MarkdownRender content="# 示例" />
  </div>
</template>
```

## Slots 与透传

渲染器本身没有公开插槽，也没有 v-model。`class`、`style` 等未声明 attributes 按 Vue 单根组件规则透传到根 `.markdown-render`。通过 `components` 注入的业务组件另有纯文本默认插槽，见 [组件注入](../guide/components)。
