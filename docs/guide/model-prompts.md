# 模型输出协议与提示词

让模型知道 Render 接受什么格式，才能稳定生成可展示的内容。本页提供中英文各一份简版与详细版提示词，并单独规定图片、音频、视频的写法。提示词与当前 Render 实现核对，不向模型默认开放演示业务组件。

[English version](../en/guide/model-prompts)

## 选择版本

| 版本 | Markdown 部分 | 多媒体 | 其他特殊格式 |
| --- | --- | --- | --- |
| 简版 | 简要列出支持的 Markdown 类型 | 单独说明标准/高级图片和显式 audio/video 指令，保留旧围栏，包含示例 | 包含组件格式约束；其余能力由宿主另行声明 |
| 详细版 | 基础语法与表格、任务列表用例 | 同样完整说明，补充地址与播放器边界 | Mermaid、公式、提示块/别名、目录、脚注、业务组件和输入引用参数 |

英文与中文版本语义对应，可按模型上下文选择其中一份，不必同时加入两份。简版适合以普通 Markdown 为主的对话；详细版适合希望模型主动使用更多展示格式的应用。使用简版但需要 Mermaid 等扩展时，应另外补充对应格式约定，或直接使用详细版。

两版都要求直接输出 Markdown 正文，不把整篇回答包在一个代码围栏中。它们是宿主模型提示词的一部分，不是传给 MarkdownRender 的 prop，也不会自行发请求、调用工具或注册组件。

## 多媒体格式速查

| 内容 | 推荐格式 | 兼容格式 |
| --- | --- | --- |
| 图片 | `![说明](URL)` 或 `::image[说明]{src="URL" width="60%"}` | 标准图片始终支持 |
| 音频 | `::audio[说明]{src="URL" type="audio/mpeg"}` | audio 单 URL 围栏 |
| 视频 | `::video[说明]{src="URL" type="video/mp4" width="80%"}` | video 单 URL 围栏 |

图片和视频 width 仅允许百分比，默认 100%，高度自动等比；音频全宽。type 可省略，不依赖地址后缀。每个媒体指令独占一行，不使用 HTML 或事件属性；业务组件继续使用现有注册标签。详见 [媒体协议](./markdown#显式媒体指令-推荐)。

## 自定义组件格式约束（提示词必读）

简版和详细版现在都包含独立的组件约束章节。组件使用现有注册标签，**不使用媒体指令 `::component`**；组件的注册、允许属性及业务数据由宿主提供，提示词不会自动注册组件。

| 项目 | 格式或约束 |
| --- | --- |
| 成对标签 | `<user-card user-id="42">查看用户</user-card>` |
| 自闭合标签 | `<user-card user-id="42" />` |
| 标签名 | 与注册表一致的小写 kebab-case |
| 属性 | 单/双引号字符串；只使用宿主声明的字段与真实数据 |
| 插槽 | 仅纯文本默认插槽，不嵌套、不解析内部 Markdown |
| 实际输出 | 直接放在正文；独立卡片前后留空行，解释源码时才放代码围栏 |
| 禁止项 | Vue 表达式/指令/事件，以及 on*、v-*、style、is、ref、key、innerHTML |
| 不可用时 | 未注册、无白名单或缺少必填数据时输出普通文字，不猜测组件或 ID |

上面的 user-card 仅用于说明语法。宿主可以把下面的约束追加到模型提示词中，但必须先替换成真实注册清单和字段规则：

```text
本应用只允许以下业务组件：
- user-card：用户卡片。必填属性 user-id，值为字符串，只能使用上下文已提供的用户 ID。
- 可选纯文本默认插槽：用于可读的操作说明，例如“查看用户”。
- 允许格式：<user-card user-id="真实ID">查看用户</user-card> 或 <user-card user-id="真实ID" />。
- 上述真实ID是占位说明，必须替换成已有数据；不得原样输出或编造。
- 实际展示时直接输出标签，不放入代码围栏；不得输出未闭合标签、嵌套组件或 ::component。
- 无有效用户 ID 时改用普通文字说明，不生成卡片；生成卡片不代表已执行业务操作。
```

渲染器只做语法与通用危险属性过滤，不自动验证每个业务组件的必填项、枚举或字段类型；这些规则应由宿主组件校验，并同时写进模型指令。详细接入见 [组件注入](./components#属性与插槽边界)。

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
