# MarkdownInput

聊天 Markdown 源码输入组件，mention 显示为可整体删除的标签。内部节点由组件维护，公共 `v-model` 与 getter 输出为字符串。组件不提供发送按钮、工具栏或发送规则。不在正文中创建媒体或业务组件容器。

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownInput } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
const text = ref('请帮我总结 **重点**。');
const shortcuts = [{ source: 'knowledge', keys: { ctrl: true, key: 'k' } }];
const options = [{ source: 'knowledge', value: 'kb-1', label: '产品知识库' }];
const editor = ref<InstanceType<typeof MarkdownInput>>();
function sendMessage() { console.log(editor.value?.getText()); }
</script>
<template>
  <MarkdownInput ref="editor" v-model="text" :mention-shortcuts="shortcuts" :options="options"
    theme="auto" :font-base-size="14" />
  <button @click="sendMessage">发送（宿主界面）</button>
</template>
```

## 文本编解码

外部文本经过 `setter` 转为内部节点；编辑变化经过 `getter` 输出到 v-model。节点只存在于编辑器与高级编解码适配边界，不作为普通输入输出。

| 接口 | 字符串含义 |
| --- | --- |
| v-model、getter() | 可恢复文本，保留 mention 的身份与名称，适合保存草稿 |
| getText() | 按顺序组装普通文字与引用后的发送文本 |
| setter(text) | 解析可恢复文本，替换编辑内容，并发出字符串 update:modelValue |

默认发送标签文字为 `prefix + label`；`serializeMention(mention) => string` 可改成业务标识或其他提示文本。不影响保存恢复协议。组件不自动清空、不发送网络请求。

默认可恢复文本协议使用保留标记：

```text
请参考 {{mention:URI编码的引用JSON}} 总结更新。
```

JSON 只包含单个引用的 id、label、prefix、source、kind、data 等身份信息，不输出整篇文档的 nodes 树。普通 Markdown、换行和转义保持不变；以双花括号开头的 mention 保留标记 及其前方连续反斜线会被可逆转义。无效或未闭合的标记保留为文字，不执行 HTML、Vue 或脚本。裸 `@名称` 不会被猜测为真实引用。

可通过 `defaultInputCodec.encode/decode` 显式使用默认协议，或分别提供自己的 `getter` 与 `setter`：

```ts
type InputGetter = (document: InputDocument) => string;
type InputSetter = (text: string) => InputDocument;
```

这是同步纯函数的高级接口。宿主负责自定义协议的可逆性、身份信息与字面量转义。decode 异常时保留为普通文字；encode 异常时回退默认协议，触发 `error({ stage: 'encode' | 'decode', message })`。

正常 v-model 回写不会重建 DOM、选区或撤销历史。外部整体替换或 setValue 重置历史；组合输入期间延后应用外部替换。更换转换函数只影响后续导入/导出，不主动重建当前内容；如需立即重新导入，调用实例 setter(text)。撤销最多保存 100 次编辑。

## 主要属性

| 名称 | 默认 | 说明 |
| --- | --- | --- |
| modelValue | 空字符串 | 可恢复文本 |
| getter | 默认文本导出函数 | `(document) => string` |
| setter | 默认文本导入函数 | `(text) => InputDocument` |
| mentionShortcuts | [] | `{ source, keys: { key, ctrl?, alt?, shift?, meta? }, prefix? }[]` |
| mentionTriggers | [] | `{ character, source }[]`，单字符与分类映射，严格空格前置 |
| prefix | []，关闭 | 兼容的未分类单字符入口；建议使用 mentionTriggers |
| options | [] | `{ value, label, source?, disabled?, kind?, data? }[]` |
| loading | false | 加载期间不能选择旧候选 |
| filterOption | 内置文字过滤 | false 由宿主搜索；或 `(query, option, prefix) => boolean` |
| placeholder | 输入消息… | 占位文字与输入区可访问名称 |
| disabled / readonly | false | 禁用 / 只读 |
| serializeMention | prefix + label | 自定义发送文字中的引用格式 |
| theme | 空字符串 | 跟随宿主 .dark / light / dark / auto |
| fontBaseSize | 12 | px，非法值回退 12 |
| themeColors | 空 | 与 render 一致的五种语义色 |
| unstyled | false | 移除默认视觉，保留编辑与菜单定位 |

快捷键必须包含至少一个修饰键与单个非空白字符键，所有修饰键精确匹配；冲突时首条配置优先。ASCII 字母数字同时按 code 匹配，避免 Option/Shift 改变字符后无法唤起。重复按键、AltGraph、输入法组词期间不触发，仅当前可编辑输入框响应。部分系统快捷键无法由网页拦截。

快捷键打开 source 对应的分类，严格过滤 `option.source === source`；即使 filterOption=false 也不会显示其他分类和未分类候选。字符触发仅在显式配置后启用，且直接输入字符时前一字符必须为半角空格。代码区域不触发任何入口。

## 事件与键盘

- `update:modelValue(text: string)`：编辑后的可恢复文本。
- `enter(event: KeyboardEvent, { inCode: boolean })`：未被候选或输入法消费的 Enter，宿主可 preventDefault() 接管；否则执行换行。
- `search({ source?, prefix, query, requestId })`：宿主按分类搜索；异步请求只应用最近一次结果。
- `select(option, context)`、`mention-remove(mention)`：引用交互元数据，不是文档输出。
- `error(error)`、`focus(event)`、`blur(event)`。

Enter 默认换行，Shift+Enter 普通换行；支持列表续行、空列表项退出，以及撤销重做。候选菜单打开时 Enter 只选择，Esc 关闭；输入法组词期间不会触发 enter 事件。发送键组合、空内容判断和清空逻辑全部由宿主实现。

## 插槽与方法

仅提供 mention 候选的定制插槽：`label({ option, source, prefix, query })`、`loading`、`empty`、`mention-header({ search })`、`mention-footer({ search })`。

不提供 add/actions/footer 等工具栏插槽，也没有发送事件、submit 方法或 submitOn 属性。添加、上传、发送按钮在宿主界面中作为输入组件的兄弟节点组装。

模板 ref 方法：`getter(): string`、`setter(text)`、`getText(): string`、`focus()`、`blur()`、`insertText(text)`、`captureSelection()`、`openMention(source)`。

宿主可在“＋”按钮 pointerdown 时调用 captureSelection，选分类时调用 openMention，恢复原选区并打开独立搜索框；搜索词不进入正文。600px 以下使用底部面板，visualViewport 辅助避开软键盘，真实设备仍需试用。

复制时提供普通发送文字及应用内私有结构化格式，粘贴时优先恢复私有格式中的标签；其他应用若移除私有格式，则作为普通文字。此私有剪贴板格式不属于公共 v-model 协议。

## 视觉与演示边界

共享 render 的 --md-* 字体、颜色、背景等变量，可通过 --md-background: transparent 设置透明容器。补充 --md-input-padding、--md-input-radius、--md-input-max-height、--md-mention-color、--md-mention-background、--md-mention-menu-background。

右侧文本检测、主题控制、消息列表、“＋”菜单和附件预览均由演示页组装，不是库组件硬编码的面板。附件处于宿主状态，不进入文本协议；目前仅本地预览，未执行网络上传。保存草稿仅保存 v-model 字符串，不保存 File。

[验证记录](../markdown-input-validation.md)

## 宿主组装示例

```vue
<MarkdownInput ref="editor" v-model="text" :getter="serialize" :setter="parse"
  @enter="handleEnter" />
<div class="host-toolbar">
  <button @pointerdown="editor?.captureSelection()"
    @click="editor?.openMention('knowledge')">引用知识库</button>
  <button @click="sendMessage">发送</button>
</div>
```

serialize 与 parse 是宿主提供的转换函数。实例 getter() 获取可恢复文本，setter(text) 导入并同步 v-model，getText() 获取按顺序拼接的可读文本。发送函数由宿主获取 getText() 后调用自己的请求接口。开发工作台仍展示发送、添加和附件，相关代码均位于 src 演示目录。

## 双入口与临时过滤（当前字符触发规则）

此节取代上文旧 prefix 扫描匹配的约定。推荐配置 mentionTriggers，多条单字符配置分别绑定分类；prefix 仅作为兼容的未分类单字符入口，默认关闭。

```ts
const mentionTriggers = [
  { character: '@', source: 'member' },
  { character: '#', source: 'knowledge' },
  { character: '/', source: 'agent' },
];
const mentionShortcuts = [
  { source: 'member', keys: { ctrl: true, key: 'u' } },
  { source: 'knowledge', keys: { ctrl: true, key: 'k' } },
];
const filterOption = (query, option) =>
  option.label.includes(query) || String(option.data?.initials ?? '').includes(query.toLowerCase());
```

提示字符必须在直接输入的瞬间前一个字符为半角空格 U+0020 才触发；仅字符本身进入正文。行首、普通文字、换行、制表符、全角空格后均不触发，代码中不触发。每项仅支持一个可打印字符，相同字符以配置数组首条有效项为准。组合键无需前置空格，也不插入提示字符。两种入口共用 options/filterOption/search。

面板打开后焦点进入临时过滤框，继续键入仅改变 search.query，不改变正文、v-model、getter/setter 或撤销历史。filterOption 可实现拼音首字母、名称或业务编码；组件不内置拼音转换，由宿主提供 initials 等数据或算法。filterOption=false 时可由外部异步搜索，source 分类隔离仍生效。输入法组词期间不更新过滤，组合完成后应用最终文字。

- 选择候选：字符入口用标签替换提示字符，保留前置空格；快捷键入口在原位置插入标签。延续已有行为，标签后添加一个便于继续输入的空格。过滤词不写入正文。
- 空格：关闭面板，消费该次空格并清空过滤词。字符入口只留下原来的提示字符，组合键入口正文不变。焦点回到正文，继续正常输入，不因旧提示字符而重新唤起。
- Esc：清空临时查询并恢复正文光标，不改变正文。
- Backspace：只删除临时过滤词，空查询时不删除正文。
- 失焦、点击正文其他位置、外部替换或禁用：取消临时过滤。撤销重做恢复提示字符不会重新唤起。
- Enter、上下键：用于候选选择，不同时触发正文换行或宿主 enter 事件。

例如正文“你好 @”，临时过滤 ljw 后正文仍为“你好 @”；空格退出后继续输入 hello，正文为“你好 @hello”。
