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

<script setup>
import MediaProtocol from "../examples/MediaProtocol.vue";
</script>

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

Mermaid 在默认 12px 时适配容器宽度，随后按 fontBaseSize 缩放整图。放大时超出视口的部分可拖拽查看，不再用 max-width 强制压回容器；`--md-font-max-size` 仍约束缩放后的文字。

协议补充：指令名和属性名区分大小写，src 必须小写；属性重复时后值覆盖前值。v1 所有属性值都是字符串，必须有等号，不支持布尔简写、JSON 参数或文件扩展名推断。视频 metadata 就绪后以视频本身的比例覆盖不同尺寸封面的比例；更换 src/MIME 会重建播放器以正确重载，调整 width 不重建播放器。
