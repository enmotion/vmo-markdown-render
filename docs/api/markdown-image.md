# MarkdownImage API

## 独立使用

`MarkdownImage` 可直接从包入口导入，独立使用时无需 MarkdownRender。它包含同一套大图预览、百分比显示、缩放、拖拽、触屏手势和错误提示。

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownImage, MarkdownRender, type ImageReference } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
const selected = ref<ImageReference>();
const content = '![海边](/images/photo.png "日落")';
</script>

<template>
  <MarkdownImage src="/images/photo.png" alt="海边" title="日落" width="320px" @reference="selected = $event" />
  <MarkdownRender :content="content" @image-reference="selected = $event" />
  <output v-if="selected">引用地址：{{ selected.src }}</output>
</template>
```

| MarkdownImage 属性 | 类型 | 默认值与说明 |
| --- | --- | --- |
| src | string | 图片展示地址；缺省不打开预览 |
| originalUrl | string | 转换前的业务地址；缺省在引用事件中使用 src |
| alt / title | string | 图片说明与标题 |
| width | string | 图片容器 CSS 宽度，如 `320px`、`60%`；缺省 100%，高度等比 |
| reference | boolean | true；显示小图引用入口，不受 preview=false 影响 |
| preview | `boolean \| ImagePreviewOptions` | true；false 或 `{ enabled: false }` 关闭预览 |
| theme | `'' \| 'light' \| 'dark' \| 'auto'` | 空值跟随祖先 `.dark`；auto 跟随系统 |

原生 class、style、load/error 等 attributes/listeners 透传到缩略图 img。独立组件直接使用 src，不执行 baseUrl/resolveUrl；需要业务转换时由宿主计算 src，并用 originalUrl 保留原地址。位于 Render 内的 MarkdownImage 共用 Render 的主题、预览选项和单个面板；其自身 `preview=false` 或 `preview={ enabled: false }` 仍可禁止打开。

鼠标悬停小图时，左下角距左边和底边各 5px 浮现双引号图标按钮；悬停提示与无障碍名称均为“引用图片”；键盘焦点进入图片区域时也显示，触屏设备常显。点击“引用”，独立组件发出 `reference`，所属 Render 发出 `image-reference`，参数均为 `ImageReference`：`{ src, originalUrl, alt?, title? }`。Render 中 src 是经 baseUrl/resolveUrl 转换后的展示地址，originalUrl 是解析所得的转换前资源地址。每次点击各触发一次，不打开大图预览，不修改输入框或复制剪贴板。父业务面板需继续对外通知时，在面板自己的 emits 中转发这个事件；Vue 组件事件不会自动跨任意祖先冒泡。

通过 `:preview="{ reference: false }"` 或 Render 的 `:image-preview="{ reference: false }"` 隐藏按钮。独立组件也可用 `:reference="false"` 隐藏按钮。关闭预览不影响引用；链接中的图片保留导航，不显示引用按钮。独立组件与 Render 之间同样只保留一个活动大图面板。

## 引用载荷与面板转发

```ts
// src 是实际展示地址；originalUrl 是转换前地址，独立图片缺省使用 src。
interface ImageReference {
  src: string;
  originalUrl: string;
  alt?: string;
  title?: string;
}
```

事件链为 `MarkdownImage @reference` → `MarkdownRender @image-reference`（若位于 Render 内）→ 业务面板自己的 `emit('image-reference', image)` → 外部监听器。独立图片自身并不发出 image-reference，业务面板需显式转发；点击引用不会打开预览或自动插入输入框。

下面两个 Vue 文件分别是业务面板和外部宿主，均通过包入口导入并经过类型检查。

<script setup>
import ImageReferenceDemo from '../examples/ImageReferenceDemo.vue';
</script>

<ClientOnly><ImageReferenceDemo /></ClientOnly>

业务面板：

<<< ../examples/ImageReferencePanel.vue

外部宿主：

<<< ../examples/ImageReferenceDemo.vue

## 预览规则与迁移

- 默认及最小尺寸：在视窗四周各留 50px 的区域内等比适配，小图保留原尺寸，此尺寸记作 100%。
- 默认最大 200%：宽、高各为初始显示尺寸的两倍，面积四倍；不能继续缩小到初始尺寸以下。
- 50px 只限制初始适配；放大和拖拽使用完整视窗。窗口尺寸变化会重新计算适配尺寸。
- 顶部胶囊左侧显示只读百分比，右侧 X 关闭预览。滚轮、双指手势和 `+` / `-` / `0` 操作缩放，也可点击空白处或按 Esc 关闭。
- maxScale 现在默认 2，并限制在 1–2；原有 8 等配置也会限制到 2。
- 右键、长按、下载和打开原图菜单已移除；longPressDownload 仅兼容保留，无效果。组件不会自动下载，手机原生菜单需在目标浏览器验证。

主题、手势及配置详情见 [预览指南](../guide/markdown#图片大图预览) 和 [ImagePreviewOptions](./markdown-render#图片预览配置)。小图 width 支持 CSS 宽度；Markdown 中的 image 指令仍只接受百分比，不把 Vue 组件 props 写进 Markdown。

## 加载失败与原生事件

独立组件的 `@load` 和 `@error` 接收原生图片事件 `Event`，不是 MarkdownError。资源加载失败不会自动移除图片；浏览器可能显示破图或 alt 文本，组件没有统一的缩略图错误占位。大图加载失败在弹层内提示。

MarkdownRender 的 `@error` 用于解析、增强、资源地址转换等错误，图片 404 或解码失败不会自动转发成这个事件。独立图片也不执行 Render 的 baseUrl/resolveUrl；宿主应提供可显示的 src，并按需传 originalUrl。完整资源错误行为见 [资源地址与代理](../guide/markdown#资源地址与代理)。

## 样式、插槽与实例边界

图片由定位用 span 容器包裹，width 控制该容器，class/style 和原生图片事件传给内部 img；不要依赖组件 `$el` 必须是 img。引用按钮的定位与交互样式由组件提供。没有公开插槽、v-model 或自定义实例方法。
