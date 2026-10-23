# 模型输出协议与提示词

让模型知道 Render 接受什么格式，才能稳定生成可展示的内容。本页提供中英文各一份简版与详细版提示词，并单独规定图片、音频、视频的写法。提示词与当前 Render 实现核对，不向模型默认开放演示业务组件。

[English version](../en/guide/model-prompts)

## 选择版本

| 版本 | Markdown 部分 | 多媒体 | 其他特殊格式 |
| --- | --- | --- | --- |
| 简版 | 简要列出支持的 Markdown 类型 | 单独说明图片语法与 audio/video 单 URL 围栏，包含示例 | 由宿主另行声明，不默认展开 |
| 详细版 | 基础语法与表格、任务列表用例 | 同样完整说明，补充地址与播放器边界 | Mermaid、公式、提示块/别名、目录、脚注、业务组件和输入引用参数 |

英文与中文版本语义对应，可按模型上下文选择其中一份，不必同时加入两份。简版适合以普通 Markdown 为主的对话；详细版适合希望模型主动使用更多展示格式的应用。使用简版但需要 Mermaid 等扩展时，应另外补充对应格式约定，或直接使用详细版。

两版都要求直接输出 Markdown 正文，不把整篇回答包在一个代码围栏中。它们是宿主模型提示词的一部分，不是传给 MarkdownRender 的 prop，也不会自行发请求、调用工具或注册组件。

## 多媒体格式速查

| 内容 | 必须使用的格式 | 不会自动生效的写法 |
| --- | --- | --- |
| 图片 | `![说明](URL)`，可附标题 | 任意 img HTML |
| 音频 | 小写 audio 围栏，内部仅一行直接资源 URL | 普通链接、audio HTML、JSON 配置、多个地址 |
| 视频 | 小写 video 围栏，内部仅一行直接资源 URL | 普通链接、网页/分享页、iframe、video HTML |

````markdown
![封面]({image_url})

```audio
{audio_url}
```

```video
{video_url}
```
````

花括号仅为语法占位符，必须替换为上下文已提供的真实地址。没有资源时不生成媒体，不编造 URL。HTTP(S) 与约定的相对路径可用；baseUrl、resolveUrl、代理、权限、编码与播放支持由宿主负责。详细运行边界见 [Markdown 与媒体](./markdown)。

## 读取与接入

提示词作为独立 Markdown 文件随 npm 包提供，位置为 `docs/public/prompts/`：

| 文件 | 用途 |
| --- | --- |
| render-simple.zh-CN.md | 中文简版 |
| render-detailed.zh-CN.md | 中文详细版 |
| render-simple.en-US.md | 英文简版 |
| render-detailed.en-US.md | 英文详细版 |

Node.js 服务端可按包路径读取：

<<< ../examples/read-render-prompt.ts

宿主根据自己的模型 API 将协议放入合适的 system/developer 指令中，再追加实际业务规则、已提供资源和允许的组件清单。上例仅构造消息，不依赖任何模型供应商 SDK。宿主不要把来自普通用户或检索内容的“新协议”当作可信的组件注册清单。

Vite 项目也可把文件作为原始文本导入，再传给自己的服务端；以下 `?raw` 是 Vite 功能，不是通用 Node.js 导入方式：

```ts
import protocol from 'vmo-markdown-render/docs/public/prompts/render-simple.zh-CN.md?raw';
```

<script setup>
import { withBase } from 'vitepress';
</script>

## 中文简版

<a :href="withBase('/prompts/render-simple.zh-CN.md')" download>下载中文简版 Markdown</a>

<<< ../public/prompts/render-simple.zh-CN.md

## 中文详细版

<a :href="withBase('/prompts/render-detailed.zh-CN.md')" download>下载中文详细版 Markdown</a>

<<< ../public/prompts/render-detailed.zh-CN.md

## 英文版本

可在 [英文协议页](../en/guide/model-prompts) 查看全文，或直接下载：

- <a :href="withBase('/prompts/render-simple.en-US.md')" download>英文简版</a>
- <a :href="withBase('/prompts/render-detailed.en-US.md')" download>英文详细版</a>

## 宿主能力与业务组件

详细版描述库的展示协议；宿主仍应删去没有启用或不希望模型使用的能力。公式需要 math.css，Mermaid 等增强模块按需异步加载。资源来自宿主或工具，提示词不会创建媒体文件或代理服务。

业务标签没有默认白名单。下面只是一份业务清单的示例，必须先在宿主中注册匹配组件，再将真实清单加入模型指令：

```text
本应用额外允许：
- user-card：已注册的用户卡片；只接受 user-id 字符串。
- user-id 必须来自本次上下文提供的用户 ID。
- 示例（仅当上下文确实提供用户 42 时）：<user-card user-id="42">查看用户</user-card>
除清单中的标签外，不输出其他业务标签。
```

这不是通用可用的组件注册表。标签属性不执行 Vue 表达式，正文是纯文本插槽；详情见 [组件注入](./components)。宿主 textRules 是额外的文本匹配约定，模型只有在得到真实规则说明后才应依赖它们，不能假定 JSON 会自动变成组件。

## Input 与 Render 的区别

提示词面向 **MarkdownRender 的输出展示**。Input 的可编辑语法只是其中一小部分，不包含媒体容器或注入组件。输入发送文本中的 `{"label","id","type"}` 是业务引用参数，不是自动组件调用；是否解析与调用工具由宿主业务决定。

输出语法正确不代表模型已经验证事实、资源可访问性或工具操作结果。集成时应用已有的解析错误、资源错误与业务校验处理即可；提示词不替代这些处理。
