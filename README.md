# vmo-markdown-render

简体中文 · [English](README.en.md)

[中文文档](https://enmotion.github.io/vmo-markdown-render/) · [English Documentation](https://enmotion.github.io/vmo-markdown-render/en/)

Vue 3 的 Markdown 渲染与聊天输入组件，提供 ESM、CommonJS 和 TypeScript 声明。

- **MarkdownRender**：完整 Markdown、累计流式内容、代码高亮、公式、Mermaid、媒体、业务组件与文本规则；图片支持跟随主题的大图预览、缩放拖拽和触屏手势。
- **MarkdownImage**：可独立引用的图片组件，小图悬停引用、主题预览、50px 初始留白与 100%～200% 缩放。[API 与面板事件转发示例](docs/api/markdown-image.md)。
- **MarkdownInput**：轻量实时排版、多分类 mention、同步/异步候选、本地/远端过滤、可配置浮窗和文案。发送按钮、接口与附件由宿主实现。
- **SpeechInput / SpeechWave**：作用域插槽控制语音输入界面，可选麦克风音量采样驱动 Canvas 波纹，支持配色、本地能力检测、转写预览与关键词事件。[用法与演示](docs/guide/speech-input.md)。
- **LocalTts**：可直接 `new` 的本地流式朗读类，支持增量/累计文本、分段队列、暂停与停止。[用法与演示](docs/guide/local-tts.md)。

## 安装

```bash
npm install vmo-markdown-render
```

宿主需要 Vue `^3.3.4`。应用入口或使用组件的文件中加载样式：

```ts
import 'vmo-markdown-render/style.css';
// 仅使用公式时需要，包含 KaTeX 样式与字体引用。
import 'vmo-markdown-render/math.css';
```

组件按需具名导入，不提供 `app.use()` 安装插件。

## Markdown 渲染

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownRender } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
const content = ref('# 你好\n\n这是一段 **Markdown**。');
</script>

<template>
  <MarkdownRender :content="content" theme="auto" :font-base-size="16" />
</template>
```

流式场景传入累计全文，并在结束时设置 `streaming=false`。原生 HTML 不作为可执行内容解析；业务组件通过 `components` 显式注册。完整属性和事件用例见 [Render API](docs/api/markdown-render.md)。

图片使用 `![说明](url)` 或 `::image[说明]{src="url" width="60%"}`，默认可点击预览。`imagePreview` 支持开关、按主题配置背景、最大缩放及小图引用；百分比显示、滚轮/双指缩放和拖拽行为见 [图片与预览](docs/guide/markdown.md#图片大图预览)。该配置由宿主传入，不是模型输出属性。

独立图片使用 `MarkdownImage` 的 `@reference`；Render 中的图片使用面板的 `@image-reference`。引用按钮在小图左下角，鼠标悬停时出现，距左、下边缘各 5px；事件包含 `{ src, originalUrl, alt?, title? }`，业务面板需继续向外通知时显式 emit 转发。完整用法见 [独立图片 API](docs/api/markdown-image.md)。

## 语音输入与本地朗读

`SpeechInput` 是无内置控件的作用域插槽组件；默认使用本地识别，不自动降级远端。宿主绑定 `hold` 或开启编辑区域空格入口，在 `result` 接收最终文字；开启 `meter` 后将 `level` 传给 `SpeechWave`。按钮、状态、语言包安装与编辑器插入完整示例见 [语音指南](docs/guide/speech-input.md)。

`LocalTts` 通过 `new LocalTts()` 创建，仅使用本地声音。每轮选择 `append(delta)` 或 `update(fullText)`，流结束调用并捕获 `finish()`，新消息 `reset()`，卸载 `dispose()`。它不解析 Markdown，也不取消宿主网络请求；流式接入和取消辅助示例见 [TTS 指南](docs/guide/local-tts.md)。ASR 识别语言包和 TTS 系统声音需要分别检查。

## 聊天输入与 mention

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownInput, type InputValue, type MentionOption, type MentionSearch } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';

const editor = ref<InstanceType<typeof MarkdownInput>>();
const value = ref<InputValue>([]);
const options = ref<MentionOption[]>([]);
const members: MentionOption[] = [
  { value: 'user-lin', label: '林见微', source: 'member' },
  { value: 'user-su', label: '苏晚棠', source: 'member' },
];
function search({ source }: MentionSearch) {
  options.value = source === 'member' ? members : [];
}
function send() {
  const text = editor.value?.getText() ?? '';
  if (!text.trim()) return;
  console.log(text); // 宿主在这里调用自己的聊天接口。
  editor.value?.setter([]);
}
</script>

<template>
  <MarkdownInput ref="editor" v-model="value"
    :mention-triggers="[{ character: '@', source: 'member' }]"
    :mention-shortcuts="[{ source: 'member', keys: { ctrl: true, key: 'u' } }]"
    :options="options" @search="search" />
  <button @pointerdown="editor?.captureSelection()" @click="editor?.openMention('member')">选择成员</button>
  <button @click="send">发送</button>
</template>
```

直接字符触发严格要求光标前一个字符是半角空格，例如 `你好 @`；正文开头单独输入 `@` 不会触发。也可使用配置的组合键或外部按钮。查询词只在候选面板中过滤，不进入正文；空格或 Esc 退出。

默认 `v-model`、`getter()` 和 `setter(value)` 使用节点数组：

```ts
[
  { label: '林见微', id: 'user-lin', type: 'member' },
  { type: 'text', content: ' 请总结' },
]
```

`getText()` 返回发送字符串，mention 保留明确参数：

```text
{"label":"林见微","id":"user-lin","type":"member"} 请总结
```

`data` 不进入默认对外数组或发送文字。组件默认 Enter 换行，Shift+Enter 普通换行；宿主通过可取消的 `enter` 事件配置发送。输入框仅支持星号粗体/斜体、短横线无序列表与有序列表，不渲染删除线、代码、引用、表格、媒体或注入组件。

## 候选获取与过滤

| 使用方式 | options 来源 | filterOption | 完整示例 |
| --- | --- | --- | --- |
| 同步候选 + 默认本地过滤 | 内存中的分类全集 | 省略 | [同步示例](docs/guide/input-mentions.md#同步候选与默认本地过滤) |
| 同步候选 + 自定义本地过滤 | 内存中的分类全集 | 自定义函数，如拼音首字母 | [自定义过滤](docs/guide/input-mentions.md#自定义本地过滤) |
| 异步获取 + 本地过滤 | 请求分类全集，按分类缓存 | 省略或自定义函数 | [异步本地过滤](docs/guide/input-mentions.md#异步获取后本地过滤) |
| 异步远端搜索 | 接口按 source/query 返回结果 | `false` | [远端过滤](docs/guide/input-mentions.md#异步远端过滤) |

组件不发送网络请求。远端模式关闭文字过滤，但仍按 `source` 隔离分类；异步请求需在宿主处理竞态、错误和缓存。示例包含完整处理及真实 HTTP 接口替换方式。

## 模型提示词与多媒体协议

为模型提供与 Render 一致的输出约定。文档包含**中英文各一份简版和详细版**，并可直接读取 npm 包内的独立 Markdown 文件：

- [协议与接入说明](docs/guide/model-prompts.md) / [English guide](docs/en/guide/model-prompts.md)
- [中文简版](docs/public/prompts/render-simple.zh-CN.md) / [中文详细版](docs/public/prompts/render-detailed.zh-CN.md)
- [Simple English](docs/public/prompts/render-simple.en-US.md) / [Detailed English](docs/public/prompts/render-detailed.en-US.md)

简版简述 Markdown 类型，并单独明确标准/高级图片与显式音视频指令（兼容旧围栏）；详细版还说明 Mermaid、公式、提示块及别名、目录、脚注和宿主业务组件。两版都要求使用真实可用的媒体地址，不把演示标签默认为宿主已注册组件。

## 文档导航

- [模型输出协议与提示词](docs/guide/model-prompts.md)
- [安装与快速开始](docs/guide/getting-started.md)
- [Input 数据、发送与保存恢复](docs/guide/input.md)
- [Mention 本地获取、远端获取与过滤完整案例](docs/guide/input-mentions.md)
- [Input 事件载荷、引用快捷键与发送热键](docs/guide/input-events.md)
- [Input 主题、文案与浮窗配置](docs/guide/input-configuration.md)
- [Input 全部 Props、Emits、实例方法和插槽](docs/api/markdown-input.md)
- [Render API 与完整配置用例](docs/api/markdown-render.md)
- [独立图片 API、引用事件与面板转发](docs/api/markdown-image.md)
- [组件注入](docs/guide/components.md)、[文本规则](docs/guide/text-rules.md)、[Markdown 与流式](docs/guide/markdown.md)
- [语音输入与波纹](docs/guide/speech-input.md)、[本地流式 TTS](docs/guide/local-tts.md)
- [公共类型与工具函数](docs/api/types.md)、[CSS 变量](docs/markdown-styles.md)

`docs/examples/` 保存可复制的 Vue/TypeScript 示例，均通过包名导入；`.vue` 通过 `docs:check` 对发布声明做类型检查。文档站直接引用这些文件作为示例源码。

## 源码开发与验证

```bash
npm install
npm run build                  # 生成 npm 产物与声明
npm run docs:check             # 根据 dist 声明检查文档示例
npm run docs:dev
npm run docs:build
npm run docs:links             # 检查构建后的本地链接和锚点
npm run test:run
npm run test:coverage           # 全部运行时代码逐文件四项覆盖率 100% 门槛
npm run test:coverage:input     # 单独检查 Input
npm run test:browser
npm pack --dry-run             # 检查发布文件，不发布
```

覆盖率范围、真实浏览器场景与边界见 [测试与兼容性](docs/guide/testing.md)。

仓库演示应用另用 `npm run dev` 启动。浏览器测试支持 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定本地 Chromium。

兼容保留 `VmoButton` 导出。维护记录与历史决策放在 `docs/markdown-*-prd.md`、架构及验证记录中；接入时以指南和 API 文档为准。
