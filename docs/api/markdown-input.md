# MarkdownInput

聊天 Markdown 源码输入组件，mention 显示为可整体删除的标签。内部节点由组件维护，公共 `v-model` 与默认 getter 输出节点数组。组件不提供发送按钮、工具栏或发送规则。不在正文中创建媒体或业务组件容器。

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownInput, type InputValue } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
const text = ref<InputValue>([{ type: 'text', content: '请帮我总结 **重点**。' }]);
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

## 默认 getter / setter

默认输出节点数组，不做 URI 编码或文本标记转义。内部节点结构：

```ts
interface InputTextNode { type: 'text'; content: string }
interface InputMentionNode {
  type: 'mention';
  content: {
    label: string;
    id: string;
    type?: string;
    data?: Record<string, unknown>;
  };
}
```

默认 getter() / v-model 输出：

```ts
[
  { type: 'text', content: '请参考 ' },
  { label: '知识库', id: 'kb-1', type: 'knowledge' },
]
```

mention 仅输出 label、id 和存在时的 type，不输出 data。默认 setter(value) 恢复同样的数组，缺省字段保持省略。data 需要宿主自定义转换保存或根据身份补齐。普通字符串按纯文字导入，不推断标签。getText() 按顺序拼接文字与 mention 的 content.label；serializeMention(node) 可自定义发送格式。标签不携带触发前缀。

getter/setter 均有默认实现，可省略配置。defaultInputCodec.encode/decode 提供同样的转换。特殊需求可配置同步函数：

```ts
type InputValueNode = InputTextNode | { label: string; id: string; type?: string };
type InputValue = InputValueNode[] | string;
type InputGetter = (document: InputDocument) => InputValue;
type InputSetter = (value: InputValue) => InputDocument;
```

setter 异常时字符串保留为普通文字，数组降级为空内容；getter 异常时回退默认数组，并触发 error 事件。节点仍进行结构校验，label 按文本渲染。私有剪贴板保存内部 data（限可 JSON 序列化的数据）。

正常 v-model 回写不会重建 DOM、选区或撤销历史。外部整体替换或 setValue 重置历史；组合输入期间延后应用外部替换。更换转换函数只影响后续导入/导出，不主动重建当前内容；如需立即重新导入，调用实例 setter(text)。撤销最多保存 100 次编辑。

## 主要属性

| 名称 | 默认 | 说明 |
| --- | --- | --- |
| modelValue | [] | 默认节点数组，自定义转换可用字符串 |
| getter | 默认数组导出函数 | `(document) => InputValue` |
| setter | 默认数组导入函数 | `(value) => InputDocument` |
| mentionShortcuts | [] | `{ source, keys: { key, ctrl?, alt?, shift?, meta? }, prefix? }[]` |
| mentionTriggers | [] | `{ character, source }[]`，单字符与分类映射，严格空格前置 |
| prefix | []，关闭 | 兼容的未分类单字符入口；建议使用 mentionTriggers |
| options | [] | `{ value, label, source?, disabled?, kind?, data? }[]` |
| loading | false | 加载期间不能选择旧候选 |
| filterOption | 内置文字过滤 | false 由宿主搜索；或 `(query, option, prefix) => boolean` |
| placeholder | 输入消息… | 占位文字与输入区可访问名称 |
| disabled / readonly | false | 禁用 / 只读 |
| serializeMention | content.label | 自定义发送文字中的引用格式 |
| theme | 空字符串 | 跟随宿主 .dark / light / dark / auto |
| fontBaseSize | 12 | px，非法值回退 12 |
| themeColors | 空 | 与 render 一致的五种语义色 |
| unstyled | false | 移除默认视觉，保留编辑与菜单定位 |

快捷键必须包含至少一个修饰键与单个非空白字符键，所有修饰键精确匹配；冲突时首条配置优先。ASCII 字母数字同时按 code 匹配，避免 Option/Shift 改变字符后无法唤起。重复按键、AltGraph、输入法组词期间不触发，仅当前可编辑输入框响应。部分系统快捷键无法由网页拦截。

快捷键打开 source 对应的分类，严格过滤 `option.source === source`；即使 filterOption=false 也不会显示其他分类和未分类候选。字符触发仅在显式配置后启用，且直接输入字符时前一字符必须为半角空格。

## 事件与键盘

- `update:modelValue(value: InputValue)`：默认输出节点数组。
- `enter(event: KeyboardEvent, { inCode: boolean })`：未被候选或输入法消费的 Enter，宿主可 preventDefault() 接管；否则执行换行。
- `search({ source?, prefix, query, requestId })`：宿主按分类搜索；异步请求只应用最近一次结果。
- `select(option, context)`、`mention-remove(mention)`：引用交互元数据，不是文档输出。
- `error(error)`、`focus(event)`、`blur(event)`。

Enter 默认换行，Shift+Enter 普通换行；支持列表续行、空列表项退出，以及撤销重做。候选菜单打开时 Enter 只选择，Esc 关闭；输入法组词期间不会触发 enter 事件。发送键组合、空内容判断和清空逻辑全部由宿主实现。

## 插槽与方法

仅提供 mention 候选的定制插槽：`label({ option, source, prefix, query })`、`loading`、`empty`、`mention-header({ search })`、`mention-footer({ search })`。

不提供 add/actions/footer 等工具栏插槽，也没有发送事件、submit 方法或 submitOn 属性。添加、上传、发送按钮在宿主界面中作为输入组件的兄弟节点组装。

模板 ref 方法：`getter(): InputValue`、`setter(value)`、`getText(): string`、`focus()`、`blur()`、`insertText(text)`、`captureSelection()`、`openMention(source)`。

宿主可在“＋”按钮 pointerdown 时调用 captureSelection，选分类时调用 openMention，恢复原选区并打开独立搜索框；搜索词不进入正文。600px 以下使用底部面板，visualViewport 辅助避开软键盘，真实设备仍需试用。

复制时提供普通发送文字及应用内私有结构化格式，粘贴时优先恢复私有格式中的标签；其他应用若移除私有格式，则作为普通文字。此私有剪贴板格式不属于公共 v-model 协议。

## 视觉与演示边界

共享 render 的 --md-* 字体、颜色、背景等变量，可通过 --md-background: transparent 设置透明容器。补充 --md-input-padding、--md-input-radius、--md-input-max-height、--md-mention-color、--md-mention-background、--md-mention-menu-background。

右侧文本检测、主题控制、消息列表、“＋”菜单和附件预览均由演示页组装，不是库组件硬编码的面板。附件处于宿主状态，不进入文本协议；目前仅本地预览，未执行网络上传。保存草稿将 v-model 数组 JSON 序列化，不保存 File。

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

serialize 与 parse 是宿主提供的转换函数。实例 getter() 默认获取节点数组，setter(value) 导入并同步 v-model，getText() 获取按顺序拼接的可读文本。发送函数由宿主获取 getText() 后调用自己的请求接口。开发工作台仍展示发送、添加和附件，相关代码均位于 src 演示目录。

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

## 轻量 Markdown 实时排版

支持 `**粗体**`、`*斜体*`，以及行首 `- ` 无序列表和 `1. ` 有序列表。标记使用英文半角字符。删除线、下划线强调、行内/围栏代码、`+ ` / `* ` 列表、引用均作为普通文字，不提供对应渲染或续行。列表标记后须有半角空格。不转换表格、媒体或复杂文档块，也不启用 HTML。

可识别的 Markdown 始终直接显示排版，光标进入、选中或失焦均不切换回源码。编辑或删除破坏包裹结构后，无法识别的部分显示原文；撤销恢复结构后重新显示排版。未闭合或无效语法保留原文。只读模式显示排版；unstyled 模式保留全部源码符号，由宿主设置外观。

显示层不改写 Markdown：v-model、getter/setter、getText、复制以及草稿恢复继续基于原始字符。原有 mention 标签可与文本标注混排，临时过滤仍不进入正文。反引号不再形成代码区域，不影响 mention 触发。

列表中的 Enter 按当前项编号递增（如 9. 后生成 10.），无序列表续写同一标记；空列表项 Enter 退出列表，Shift+Enter 普通换行。不会自动重排已有编号。输入法组词和候选面板优先消费 Enter。

enter 事件上下文新增 `inList: boolean`，帮助宿主决定是否接管按键；兼容字段 inCode 固定为 false。开发演示的普通 Enter 发送规则会跳过列表，使其正常换行；组合发送键仍由宿主控制。

行内语义复用 markdown-it，输入显示适配层通过规则钩子记录源码位置。DOM 保留隐藏标记，选区仍按原始文本定位，光标移动不切换渲染状态，也不重建节点或新增撤销记录。
