# MarkdownInput API

从 `vmo-markdown-render` 导入 `MarkdownInput`；样式通过 `vmo-markdown-render/style.css` 导入。[快速开始](../guide/getting-started) 提供完整宿主，[候选指南](../guide/input-mentions) 提供同步/异步与本地/远端过滤用例。

## 内容字号上限

```vue
<MarkdownInput :font-base-size="32" style="--md-font-max-size: 24px" />
```

此例编辑区、占位文字、引用和候选菜单以受限的 24px 基础字号显示。该变量与 Render 共用，也可配置在两个组件的共同祖先上；默认不限制。使用正数 px/rem；旧的 `--md-heading-max-size` 已移除。详见 [主题与字号](../guide/theme#内容字号上限与标题字号)。

## Props

模板使用 kebab-case，TypeScript 属性使用 camelCase。每个配置的完整用例在最后一列。

| 属性 | 类型 | 默认 | 说明 / 用例 |
| --- | --- | --- | --- |
| modelValue | `InputValue` | `[]` | 默认文字/mention 数组；[数据与发送](../guide/input#默认数据协议) |
| getter | `InputGetter` | 默认数组导出函数 | 内部 document 转外部数组或自定义字符串；[自定义转换](../guide/input#自定义-getter-setter) |
| setter | `InputSetter` | 默认数组导入函数 | 外部数组/字符串转内部 document；同上 |
| prefix | `string \| readonly string[]` | `[]` | 兼容的无分类字符入口；[用例](../guide/input-mentions#兼容的无分类-prefix) |
| mentionTriggers | `readonly MentionTrigger[]` | `[]` | 字符与分类映射，严格半角空格前置；[同步用例](../guide/input-mentions#同步候选与默认本地过滤) |
| mentionShortcuts | `readonly MentionShortcut[]` | `[]` | 精确组合键与分类映射；[配置规则](../guide/input-mentions#字符与组合键规则) |
| options | `readonly MentionOption[]` | `[]` | 当前候选，由宿主同步赋值或异步加载；[四种模式](../guide/input-mentions) |
| loading | `boolean` | `false` | 显示加载状态、阻止候选选择；[异步用例](../guide/input-mentions#异步获取后本地过滤) |
| filterOption | `false \| ((query, option, prefix) => boolean)` | 默认 label / value 过滤 | false 仅关闭文字过滤，仍隔离 source；[本地](../guide/input-mentions#自定义本地过滤) / [远端](../guide/input-mentions#异步远端过滤) |
| placement | `MentionPlacement` | `'auto'` | auto / top / bottom，优先方向、自动避让；[配置用例](../guide/input-configuration#桌面浮窗与移动面板) |
| offset | `number` | `6` | 光标浮窗间距 px，非法值回退 6；同上 |
| mobilePlacement | `MentionMobilePlacement` | `'bottom-sheet'` | bottom-sheet / caret，断点 600px；同上 |
| i18n | `Partial<InputI18n>` | 中文默认 KV | 部分文案覆盖；[全部文案与用例](../guide/input-configuration#i18n-外部-kv-覆盖) |
| placeholder | `string` | `i18n.placeholder` | 显式属性优先，空字符串可覆盖；[配置用例](../guide/input-configuration#完整配置用例) |
| disabled | `boolean` | `false` | 禁止用户编辑/候选唤起，tabindex=-1；同上 |
| readonly | `boolean` | `false` | 用户只读，不显示标签删除按钮；同上 |
| theme | `'' \| 'light' \| 'dark' \| 'auto'` | `''` | 跟随宿主 / 指定主题 / 跟随系统；[主题用例](../guide/input-configuration#主题、字号与背景) |
| fontBaseSize | `number` | `12` | px；非正数或非有限值回退 12；同上 |
| themeColors | `ThemeColors` | 无覆盖 | 亮／暗基础色与五种语义色；同上 |
| unstyled | `boolean` | `false` | 移除默认视觉，保留行为；[说明与用例](../guide/input-configuration#完整配置用例) |
| serializeMention | `(node: InputMentionNode) => string` | 参数 JSON | 改变发送/纯文本复制表达；[用例](../guide/input#最终发送文字) |

filterOption 完整参数类型为 `(query: string, option: MentionOption, prefix: string) => boolean`，应同步返回结果。getter / setter 是同步纯转换，不要在其中请求数据。未声明的 class/style 等属性透传到根容器。

## Emits

候选获取/过滤按 [四种接法](../guide/input-mentions) 配置；真实回调载荷、v-model 与 getText 区别、引用快捷键和发送策略见 [事件与热键完整案例](../guide/input-events)。

[InputChat.vue 完整用例](../guide/input#外部发送、事件与保存恢复) 注册了下表全部事件。

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| update:modelValue | `(value: InputValue)` | 用户编辑、撤销/重做或实例 setter 后输出；v-model 已自动监听 |
| search | `(context: MentionSearch)` | 打开面板及查询词变化；组词结束后触发，requestId 递增 |
| select | `(option: MentionOption, context: MentionSearch)` | 选择候选并插入标签后 |
| mention-remove | `(node: InputMentionNode)` | 编辑或按钮删除标签后；业务字段在 node.content |
| enter | `(event: KeyboardEvent, context: InputEnterContext)` | 未被输入法/候选消费的 Enter；preventDefault 接管默认换行 |
| error | `(error: InputCodecError)` | getter/setter 异常或非法返回值；不报告宿主网络请求异常 |
| focus | `(event: FocusEvent)` | 正文输入区获得焦点 |
| blur | `(event: FocusEvent)` | 正文输入区失焦；转到内部搜索框时也会触发 |

```ts
interface MentionSearch {
  prefix: string;
  query: string;
  source?: string;
  requestId: number;
}
interface InputEnterContext { inCode: boolean; inList: boolean }
interface InputCodecError { stage: 'encode' | 'decode'; message: string }
```

没有 submit/send 事件，没有发送 prop。inCode 是兼容字段，当前固定 false。选中 mention 后会追加一个空格。关闭面板没有独立 close 事件。更新文案或位置配置不会主动触发 search。

## 实例方法

```ts
import { ref } from 'vue';
import { MarkdownInput } from 'vmo-markdown-render';
const editor = ref<InstanceType<typeof MarkdownInput>>();
```

| 方法 | 签名 | 行为 / 用例 |
| --- | --- | --- |
| getter | `() => InputValue` | 当前默认节点数组或自定义转换结果；[保存恢复](../guide/input#外部发送、事件与保存恢复) |
| setter | `(value: InputValue) => void` | 替换内容并输出 v-model，重置历史；同上 |
| getText | `() => string` | 正文与 mention 参数 JSON 拼接的发送字符串；[发送格式](../guide/input#最终发送文字) |
| focus | `() => void` | 聚焦正文并将光标放在末尾；[完整宿主](../guide/input#外部发送、事件与保存恢复) |
| blur | `() => void` | 正文输入区失焦；同上 |
| insertText | `(text: string) => void` | 在当前选区插入纯文字；不可编辑时不执行；同上 |
| captureSelection | `() => void` | 保存正文选区供 openMention 恢复；同上 |
| openMention | `(source: string) => void` | 通过已配置的 trigger/shortcut 打开该分类；不存在的分类不打开；同上 |
| getValue | `() => InputValue` | getter 的兼容别名 |
| setValue | `(value: InputValue) => void` | setter 的兼容别名 |

```ts
const snapshot = editor.value?.getValue(); // 兼容旧方法名。
if (snapshot !== undefined) editor.value?.setValue(snapshot);
```

外部按钮推荐在 pointerdown 时 captureSelection，再在 click 时 openMention。单独调用 focus 会移到末尾，不用于恢复旧选区。

```vue
<button @pointerdown="editor?.captureSelection()" @click="editor?.openMention('member')">选择成员</button>
<button @pointerdown.prevent @click="editor?.insertText('补充')">在保留的选区插入文字</button>
```

## Slots

仅提供候选面板插槽。[完整宿主用例](../guide/input#外部发送、事件与保存恢复) 包含全部插槽的实现。

| 名称 | 插槽参数 | 默认行为 |
| --- | --- | --- |
| label | `{ option, prefix, query, source }` | 显示 option.label 及可选 kind |
| loading | 无 | i18n.mentionLoading |
| empty | 无 | i18n.mentionEmpty |
| mention-header | `{ search }` | 显示 source 与 i18n.mentionHint |
| mention-footer | `{ search }` | 不渲染默认内容 |

search 按 MentionSearch 使用；不要依赖未声明的内部编辑偏移。自定义插槽中的翻译由宿主负责，组件不对插槽内容再应用 i18n。

没有 add/actions/footer 等工具栏插槽。添加、上传、发送按钮应作为兄弟组件放在宿主布局中，不属于 Input 的内部职责。

## 相关配置与边界

- [默认/自定义数据协议与导出](../guide/input)
- [同步候选、异步本地过滤、远端过滤与竞态](../guide/input-mentions)
- [i18n、主题、浮窗、移动端底部面板](../guide/input-configuration)
- [公共类型及 defaultInputCodec / defaultInputI18n](./types)

正文不创建图片、音视频或注入组件容器。完整 Markdown 渲染请使用 MarkdownRender；Input 的轻量编辑语法见 [编辑语法](../guide/input#编辑语法与复制)。
