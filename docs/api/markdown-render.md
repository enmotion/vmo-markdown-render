# MarkdownRender API

## 完整配置与事件用例

本例覆盖全部 Render props 和 emits。流式按钮使用累计内容，主题、文本规则、组件注入、提示标题与资源转换按实例配置。资源示例的 `/api/media` 是宿主自建接口；只有匹配的资源才会走此转换。

<script setup>
import RenderComplete from '../examples/RenderComplete.vue';
</script>

<ClientOnly><RenderComplete /></ClientOnly>

<<< ../examples/RenderComplete.vue

更详细的组件注入、VNode 规则、资源和流式用例见 [组件注入](../guide/components)、[文本规则](../guide/text-rules)、[语法与流式](../guide/markdown)。本页只描述 Render；输入框配置见 [Input API](./markdown-input)。

## Props

模板中使用 kebab-case，例如 `:text-rules="rules"`；TypeScript 中使用 camelCase。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| content | `string` | `''` | 当前累计完整 Markdown，不是增量分片 |
| baseUrl | `string` | `undefined` | 资源基础绝对 URL；目录地址以 `/` 结尾 |
| resolveUrl | `ResourceUrlResolver` | `undefined` | 同步转换图片、音频、视频 URL，不处理普通链接 |
| streaming | `boolean` | `false` | 生成期间进行语法补全；结束后设为 false，按原文解析 |
| theme | `'' \| 'light' \| 'dark' \| 'auto'` | `''` | 空值跟随宿主祖先 `.dark`；auto 跟随系统 |
| themeColors | `ThemeColors` | `undefined` | 实例级 lightBackground、darkBackground 及五种语义色 |
| fontBaseSize | `number` | `12` | px；非正数、NaN、Infinity 回退为 12 |
| components | `Record<string, Component>` | `{}` | 小写 kebab-case 标签映射；各实例独立 |
| textRules | `readonly TextRule[]` | `[]` | 正文正则转换，支持文本、VNode 与组件输出 |
| alertLabels | `Readonly<Record<string, string>>` | `undefined` | 大写提示类型到标题的翻译，Markdown 自定义标题优先 |
| unstyled | `boolean` | `false` | 不添加 `md-styled`，移除默认排版主题，保留语义结构与功能 |

映射与数组的默认值按实例创建。类型详情见 [TypeScript 类型](./types)。

## 内容字号上限与 H1～H6 标题字号配置

标题字号通过组件根元素的 **CSS 变量** 配置，不是新增 prop。使用前请加载 `vmo-markdown-render/style.css`。

```vue
<MarkdownRender
  :content="content"
  :font-base-size="16"
  :style="{
    '--md-h1-font-size': '1.6em',
    '--md-h2-font-size': '1.4em',
    '--md-h3-font-size': '1.2em',
    '--md-h4-font-size': '1.1em',
    '--md-h5-font-size': '1em',
    '--md-h6-font-size': '0.9em',
    '--md-font-max-size': '24px',
  }"
/>
```

| 配置 | 默认值 | 行为 |
| --- | --- | --- |
| `--md-h1-font-size` ～ `--md-h6-font-size` | 2 / 1.65 / 1.35 / 1.15 / 1 / .9em | 分别设置各级标题字号 |
| `--md-font-max-size` | 不限制 | 组件内容统一字号上限，包含基础文字与各级标题 |

上述示例中，正文为 16px，H1 计算为 25.6px，经上限约束后显示为 24px。只想限制最大字号时，单独配置 `style="--md-font-max-size: 24px"` 即可。`em` 跟随 `fontBaseSize`，`px` 为固定字号；上限也约束正文和 Input（在对应实例或共同祖先配置），不改变宿主页面字号。`unstyled` 模式不应用这些标题样式。默认字号不会自动缩小，需要显式配置。

也可在外部 class 或祖先元素设置相同变量，Vue scoped 样式只需匹配组件根元素，无需 `:deep()`。更多配色和字号说明见 [主题与样式](../guide/theme#内容字号上限与标题字号) 和 [CSS 变量](../markdown-styles)。

字号上限请使用正数 px/rem，以便在各级文字中保持统一物理上限；不建议用 em 作为统一上限。旧变量 `--md-heading-max-size` 已移除，请迁移至 `--md-font-max-size`。公式的基础字号同样受限，内部数学排版比例保留；Mermaid 限制整图缩放后的文字大小。业务插槽组件若自行指定字号，应消费此上限变量。`unstyled` 模式的排版由宿主负责。

## 图片与音视频协议

```markdown
![标准图片](/images/photo.png)

::image[高级图片]{src="/images/photo.png" width="60%"}

::audio[录音]{src="/media/recording.mp3" type="audio/mpeg"}

::video[演示]{src="/media/demo.mp4" type="video/mp4" width="80%" poster="/images/cover.png"}
```

图片与视频默认 100% 宽，width 只接受 (0%, 100%] 百分比，高度等比。音频全宽。旧 audio/video 围栏继续兼容，自定义组件协议不变。语法是本库采用的 Generic Directives 单行子集，完整属性、流式边界及两种图片实时展示见 [媒体协议](../guide/markdown#显式媒体指令-推荐)。

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

## 模型输出协议

模型提示词需与实际注册/启用的展示能力一致。见 [中英文简版与详细版提示词](../guide/model-prompts)，其中单独说明图片、音频、视频的准确写法。
