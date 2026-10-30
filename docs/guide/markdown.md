# Markdown 与流式渲染

## 支持的语法

支持标题、列表、引用、表格、任务列表、删除线、链接、图片、代码高亮与脚注。任务列表仅展示，不提供编辑事件。原生 HTML 按文本显示，没有启用 HTML 或 Vue 模板编译的开关。

`[TOC]` 独占一行生成目录；标题与脚注 ID 在组件实例间隔离，应使用 `headings-change` 返回的 id，不要自行推测锚点值。

````markdown
# 示例

[TOC]

- [x] 已完成
- [ ] 待处理

```ts
const message = 'hello';
```

```mermaid
graph LR
  A --> B
```

行内公式：$E=mc^2$

$$
a^2 + b^2 = c^2
$$
````

高亮、KaTeX、Mermaid 按需异步加载。加载或渲染失败会保留源码并触发 `error`；公式需要额外导入 `vmo-markdown-render/math.css`。

## 图片

```markdown
![图片无法加载时的替代文本](/images/example.png "鼠标悬停显示的标题")
```

图片使用懒加载，默认占满所在内容区宽度，高度按原始比例自适应，不随 `fontBaseSize` 缩放；`unstyled` 模式下由宿主自行设置图片样式。未配置 `baseUrl` 时，URL 由浏览器相对当前页面解析；可通过下文的资源地址配置指定来源与代理。开发工作台提供本地 AI 生成的山峰日出 PNG 图片，可直接检查标题、全宽布局和窄屏展示。

### 图片大图预览

内置图片默认支持点击预览，也可聚焦后按 Enter 或空格打开。预览通过 Teleport 挂载到 `body`，避免被正文容器裁切。链接中的图片仍保留原链接行为。传入 `:image-preview="false"` 可以关闭预览。

```vue
<MarkdownRender
  :content="content"
  :image-preview="{
    enabled: true,
    background: { light: '#ffffff', dark: '#151821' },
    maxScale: 8,
    longPressDownload: true,
  }"
/>
```

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| enabled | true | 是否启用预览 |
| background | 当前 Render 背景 | CSS 颜色字符串或 `{ light?, dark? }`；未指定的模式跟随 Render 背景 |
| maxScale | 8 | 相对适应屏幕尺寸的最大倍率，限制在 1–32 |
| longPressDownload | true | 触屏静止长按约 550ms 后显示下载／打开原图菜单 |

预览继承打开图片的 Render 实例的有效主题、背景和文字颜色，支持 `theme`、祖先 `.dark`、系统主题和 `themeColors`，并在打开期间同步主题变化。背景配置请使用实际 CSS 颜色；Teleport 后无法继承只定义在正文容器中的自定义变量。`unstyled` 仍保留预览交互与必要的全屏布局。

- 鼠标滚轮以光标位置为中心缩放；拖拽平移，图片不会完全移出屏幕；某一方向未超出视口时，该方向保持居中。
- 移动端双指同时缩放和移动，单指拖拽；拖动、第二根手指或取消手势会取消长按。
- 默认只显示缩放百分比，以适应屏幕尺寸为 100%；小图不会在初始显示时强制放大。下载和打开原图入口位于长按菜单，桌面端可右键打开菜单。
- 单击图片外的空白背景或按 Esc 关闭（菜单打开时，第一次 Esc 只关闭菜单）；点击图片、拖拽和双指手势不会误关闭。`+` / `-` 缩放，`0` 重置。关闭后恢复页面滚动和原焦点。
- 下载只在点击下载按钮后发起。跨域资源需服务器允许 CORS；失败时保留“打开原图”入口，由浏览器提供保存方式。组件不会绕过跨域限制。

同一时间只显示一个图片预览。来源图片被移除、更换地址、关闭预览能力或卸载 Render 时，会关闭预览并清理手势、下载请求和临时资源。

### 预览配置与接入边界

标准 `![alt](url)` 与高级 `::image` 均走内置图片组件，共享懒加载、资源转换和预览能力；不需要把图片注册到 components。`MarkdownImage` 和预览弹层不是包入口的独立导出，内部路径与注入 key 不属于公共协议。业务组件或 textRules 生成的 `<img>` 不会自动获得此预览；需要宿主自行接入其图片交互。

`imagePreview` 是 Render 的宿主配置，不是 Markdown 指令属性。`::image{... preview="false"}`、`maxScale`、`style` 等未知属性不会控制弹层；当前没有按图片覆盖、外部受控打开、预览事件或图库切换 API。若某张图应直接导航，可使用 `[![说明](/image.png)](/image.png)` 保留图片链接行为；整实例关闭则使用 `false` 或 `{ enabled: false }`。不要在 Markdown 中写 `imagePreview="false"` 代替 Vue 的布尔绑定。

缩放范围为 **1 到 maxScale**；100% 表示适应屏幕后的尺寸，不是原图像素 1:1。大图初始缩小到视口内，小图保留原尺寸；maxScale=1 仍能打开预览，只是不再放大。NaN/Infinity 的 maxScale 回退 8，有限值限制到 1–32。正文的 width 不限制全屏预览尺寸，fontBaseSize 与正文标题字号上限也不控制弹层。

`longPressDownload=false` 只停用触屏长按菜单，**桌面右键菜单仍可用**；此项不是禁止下载或保护图片的权限开关。Tab/Shift+Tab 将焦点留在预览操作中；弹层没有常驻关闭/下载工具栏，主要入口为空白处点击、Esc、右键或触屏长按。当前提示、菜单及辅助名称使用中文，没有预览 i18n 配置。

预览使用经过 baseUrl/resolveUrl 处理后的**同一个 src**；没有另一个高清图地址字段，也不会在下载时再次调用转换器。打开可能再次进行图片加载/解码，是否复用缓存由浏览器决定。打开原图、下载也使用最终 src；若是代理或签名 URL，代理需提供实际图片并在使用期间保持地址有效。

图片“能显示”不等于“能 fetch 下载”。下载按钮会 fetch 图片、读取 Blob，再触发浏览器下载；HTTP 错误或 CORS 失败只在弹层内显示提示，不触发 Render 的 `error` 事件。组件未提供自定义下载请求头或 credentials 配置，跨域授权与文件名应由宿主代理服务处理；文件名默认来自最终 URL 路径末段，无路径文件名时回退 image。图片加载失败也在弹层显示提示，仍可从菜单打开原图。`resolveUrl` 拒绝地址、转换异常等才按已有协议报告 `stage: 'resource'`。

Teleport 的弹层位于 body，正文祖先选择器或只匹配 Render 后代的 scoped 样式无法直接覆盖它。优先用 imagePreview.background 和实例 theme/themeColors 配色；该背景字段接收 CSS 颜色，不沿用 ThemeColor 的运行时格式校验。一般无需自行指定 z-index；它使用固定全屏布局并锁定 body 滚动。只改外部 CSS 变量/背景时，会在下次打开或相关主题配置更新时重新取色，不监听任意外部样式变化。

下面可切换主题、预览开关、最大倍率和触屏长按菜单；菜单关闭时按 Esc 退出。

<script setup>
import ImagePreviewDemo from '../examples/ImagePreviewDemo.vue';
import MediaProtocol from '../examples/MediaProtocol.vue';
</script>

<ClientOnly><ImagePreviewDemo /></ClientOnly>

<<< ../examples/ImagePreviewDemo.vue

完整选项类型见 [Render API](../api/markdown-render#图片预览配置)，触屏和跨域检查见 [测试与兼容性](./testing#语音与图片预览的人工验收)。

<ClientOnly><MediaProtocol /></ClientOnly>

### 显式媒体指令（推荐）

支持 Generic Directives 的单行 leaf 语法子集；image/audio/video 名称与属性是本库媒体协议 v1，不是 CommonMark 官方媒体标准。无需根据文件后缀猜测类型。

```markdown
![标准图片](/images/example.png "可选标题")

::image[高级图片]{src="/images/example.png" width="60%" title="可选标题"}

::audio[录音说明]{src="/media/example.mp3" type="audio/mpeg"}

::video[演示说明]{src="/media/example.mp4" type="video/mp4" poster="/images/cover.png" width="80%"}
```

每个指令独占一行；`src` 必填，`[]` 为纯文本说明（图片 alt／播放器 aria-label），`title` 可选。属性推荐使用双引号；支持单引号和无空格的无引号值，以及 Markdown 转义、实体。此版本不支持行内指令、容器指令、嵌套正文、class/id 快捷语法或任意组件指令。自定义业务组件沿用原有白名单标签设计。

| 属性 | 支持范围 | 规则 |
| --- | --- | --- |
| src | 三类媒体 | 相对路径或 HTTP(S)，经过 baseUrl / resolveUrl |
| title | 三类媒体 | 鼠标提示 |
| width | 图片、视频 | 仅百分比，0% < 值 ≤ 100%；缺省或非法值回退 100% |
| type | 音频、视频 | 可选 MIME，如 audio/mpeg、video/mp4；不匹配类别或格式非法时忽略 |
| poster | 视频 | 封面图片，按 image 资源经过 baseUrl / resolveUrl |

图片和视频高度自动保持原始比例，不支持独立 height；默认全宽且不随字号缩放。音频播放器始终全宽，忽略 width。专用 width 会保留在 unstyled 模式；未指定时 unstyled 的默认布局仍由宿主决定。未知属性与指令原文保留在内部解析节点，不透传到 DOM；事件、style、autoplay 等属性不执行。当前未提供 Markdown 导出器。非法／未闭合指令和未知指令保留为文本，不挂载；流式输入只识别原文中完整的一行，补全器不能制造资源请求。

原生控件默认 controls、preload=metadata、无自动播放；视频 playsinline。资源不可用时仍遵循浏览器加载失败行为，危险 URL 及转换失败会移除地址并报告 resource 错误。MIME 与 src 分开声明，地址可无后缀。

## 音频与视频

旧版 `audio` / `video` 单 URL 围栏继续兼容，推荐新文档使用上述显式指令。

````markdown
```audio
/media/example.mp3
```

```video
/media/example.mp4
```
````

渲染为浏览器原生播放器，默认显示播放控件、只预加载元数据、不自动播放；视频支持行内播放。默认全宽，图片和视频使用 `--md-radius` 圆角；`unstyled` 下由宿主设置样式。音视频原生控件通过 `color-scheme` 跟随实例主题（包括宿主暗色和 auto 模式）；具体外观及暗色支持由浏览器决定。

媒体围栏不支持标题或多行配置；不符合格式时保留为代码块。资源需由宿主提供，能否播放取决于浏览器支持的编码、资源地址及服务器响应。不自动将普通链接或图片语法识别为媒体，不嵌入第三方 iframe，也不需要开启原生 HTML。

## 提示块

```markdown
> [!WARNING] 发布前检查
> 请确认配置已更新。
```

| 标记 | 语义色 |
| --- | --- |
| IMPORTANT | primary |
| NOTE / INFO | info |
| TIP / SUCCESS | success |
| WARNING | warning |
| CAUTION / DANGER / ERROR | danger |

INFO、SUCCESS、DANGER、ERROR 是本库别名；TIP 表示技巧。标题优先级为 Markdown 内自定义标题、`alertLabels` 对应的大写键、默认英文类型名。

```vue
<MarkdownRender
  :content="content"
  :alert-labels="{ IMPORTANT: '重点', NOTE: '备注', TIP: '建议', WARNING: '警告' }"
/>
```

## 流式内容

`content` 始终传入已收到的完整内容，每个网络分片追加到宿主状态；开始时开启 `streaming`，结束或中断后关闭。

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownRender } from 'vmo-markdown-render';

const content = ref('');
const streaming = ref(false);
async function consume(chunks: AsyncIterable<string>) {
  content.value = '';
  streaming.value = true;
  try {
    for await (const chunk of chunks) content.value += chunk;
  } finally {
    streaming.value = false;
  }
}
// 将你的网络分片异步迭代器传给 consume(chunks)。
</script>

<template>
  <MarkdownRender :content="content" :streaming="streaming" />
</template>
```

流式模式尝试补全 Markdown 展示，生成结束后重新按原文解析。组件标签必须完整才挂载；正则规则需自行设置结束条件，详见 [组件注入](./components) 与 [正则规则](./text-rules)。

### MDN 在线示例

工作台已嵌入以下在线资源：

- [音频来源](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/audio)：`https://developer.mozilla.org/shared-assets/audio/t-rex-roar.mp3`
- [视频来源](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers)：`https://developer.mozilla.org/shared-assets/videos/flower.mp4`

## 资源地址与代理

`baseUrl` 补全内置图片、音频、视频的相对路径；`resolveUrl` 在补全之后同步转换地址，可用于代理、CDN 或已准备好的签名地址。

```vue
<script setup lang="ts">
import { MarkdownRender, type ResourceUrlResolver } from 'vmo-markdown-render';
const content = '![封面](./cover.png)';
const resolveUrl: ResourceUrlResolver = (url, { type, originalUrl }) => {
  console.log(type, originalUrl); // image / audio / video 与 Markdown 原始地址
  return `/api/resource-proxy?url=${encodeURIComponent(url)}`;
};
</script>

<template>
  <MarkdownRender :content="content" base-url="https://example.com/docs/article/" :resolve-url="resolveUrl" />
</template>
```

- `./cover.png` → `https://example.com/docs/article/cover.png`。
- `../audio.mp3` → `https://example.com/docs/audio.mp3`。
- `/video.mp4` → `https://example.com/video.mp4`。
- 完整地址保持其来源域名；`//cdn.example.com/a.png` 使用基址协议。

`baseUrl` 必须是绝对 URL，遵循标准 URL 解析规则；不以 `/` 结尾的路径按文件地址处理。未配置时保留原地址，回调可能收到相对地址，最终由浏览器解析。SSR 不依赖 window 或当前页面地址。

回调是同步纯转换函数，可能随重新渲染多次调用，不应在里面发请求；异步签名应由宿主预先获取后更新 props。没有扩展名的资源也能通过 `type` 准确区分。它仅处理内置资源，不处理链接、代码、正则回调输出的 VNode 或注入组件内部的资源。

处理前后均拒绝危险协议，资源仅接受相对地址或 HTTP(S)。空地址不请求；无效基址、转换回调抛错或返回无效地址时移除 `src`，触发 `error`，其 `stage` 为 `resource`，不会回退请求原资源。

URL 转换不会创建代理服务；代理后端由宿主实现，音视频应支持 Range 请求。若代理涉及来源限制与鉴权，由后端统一处理。

给模型使用的简版/详细版协议与多媒体输出规则，见 [模型输出协议与提示词](./model-prompts)。

Mermaid 使用屏幕外、保留布局能力的专用容器测量，绘制中的临时 SVG 不会显示在正文外或扩大页面。多图按队列隔离主题；仅切换主题时保留旧图，新图成功后替换。失败仍回退源码并触发 `stage: 'mermaid'` 错误，过期结果不会覆盖最新内容，临时容器在绘制结束的 finally 中清理。

默认使用 Dagre 布局，减少 Mermaid 12 默认 ELK 布局在主线程上的计算开销。与 ELK 相比，节点位置和连线路径会有所不同；需要 ELK 时，可在 Mermaid 围栏内的源码开头指定 `config.layout`。队列中已被新内容替代或已卸载的图表会在开始绘制前跳过；已经开始的布局仍需等待完成。图片预览的打开、关闭不会重新布局已有图表。

````markdown
```mermaid
---
config:
  layout: elk
---
flowchart LR
  A --> B
```
````

Mermaid 在默认 12px 时适配容器宽度，随后按 fontBaseSize 缩放整图。放大时超出视口的部分可拖拽查看，不再用 max-width 强制压回容器；`--md-font-max-size` 仍约束缩放后的文字。

协议补充：指令名和属性名区分大小写，src 必须小写；属性重复时后值覆盖前值。v1 所有属性值都是字符串，必须有等号，不支持布尔简写、JSON 参数或文件扩展名推断。视频 metadata 就绪后以视频本身的比例覆盖不同尺寸封面的比例；更换 src/MIME 会重建播放器以正确重载，调整 width 不重建播放器。
