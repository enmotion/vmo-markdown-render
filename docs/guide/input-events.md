# Input 事件、引用快捷键与发送热键

候选如何获取/过滤见 [Mention 四种接法](./input-mentions)。本页解决：回调收到什么、选择后输出什么，以及 Enter 到底选择候选、换行还是发送。

## 可运行的完整事件案例

下面例子包含全部 8 类组件事件、两类引用入口、三种发送策略，以及每次事件的实际参数记录。只在本地展示发送结果，不访问聊天接口。

<script setup>
import InputEvents from '../examples/InputEvents.vue';
</script>

<ClientOnly><InputEvents /></ClientOnly>

<<< ../examples/InputEvents.vue

操作顺序：点击“打开成员引用”→ 搜索框输入“林”→ Enter 选择 → 正文输入消息 → Ctrl/Cmd+Enter 发送。观察 `search`、`update:modelValue`、`select`、`enter` 和宿主 `host-send` 的不同数据。也可以删除标签，观察 `mention-remove`。示例日志中的 args 是各回调参数组成的数组，不是组件额外包了一层数组。

## 事件参数，逐一对应

| 事件 | 回调参数 | 不是 |
| --- | --- | --- |
| update:modelValue | `(value: InputValue)` | 不是 DOM InputEvent；v-model 已监听 |
| search | `(context: MentionSearch)` | 不是搜索结果，不会自动请求后端 |
| select | `(option: MentionOption, context: MentionSearch)` | 不是单个 `{ option, context }` 对象 |
| mention-remove | `(node: InputMentionNode)` | 不是候选 option，业务字段在 node.content |
| enter | `(event: KeyboardEvent, context: InputEnterContext)` | 不是已发送消息；需要同步 preventDefault |
| error | `({ stage: 'encode' 或 'decode', message })` | 不是候选 HTTP 请求错误 |
| focus | `(event: FocusEvent)` | 正文获得焦点；示例仅记录 type 以便 JSON 展示 |
| blur | `(event: FocusEvent)` | 正文失焦；进入内部搜索框也可能触发，不等于面板关闭 |

```ts
function onSelect(option: MentionOption, context: MentionSearch) {
  // option:
  // { value:'user-lin', label:'林见微', source:'member', data:{ initials:'ljw' } }
  // context:
  // { prefix:'@', query:'林', source:'member', requestId:2 }
}
function onRemove(node: InputMentionNode) {
  // { type:'mention', content:{ id:'user-lin', label:'林见微', type:'member', data:{ initials:'ljw' } } }
}
```

类型从 `vmo-markdown-render` 导入。每次打开先发空 query 的 search，临时查询变化再发 search；requestId 按实例递增。选择时返回该次查询的 context，组件同时更新 v-model；不要依赖 focus/blur 等浏览器事件的固定全局顺序。没有独立 close、submit 或 send 事件。

## 三种输出不要混淆

假设正文为“请让 ”，再选择成员并输入“总结”：

```ts
// 1. v-model、update:modelValue、实例 getter()：默认外部节点数组
[
  { type: 'text', content: '请让 ' },
  { label: '林见微', id: 'user-lin', type: 'member' },
  { type: 'text', content: ' 总结' },
]

// 2. select：原候选 option + 搜索 context，见上一节
// 3. 实例 getText()：发送/纯文本复制使用的字符串
'请让 {"label":"林见微","id":"user-lin","type":"member"} 总结'
```

外部数组的 mention 没有外层 `type:'mention'`/`content`，并省略 data。`mention-remove` 使用内部节点格式；这两种不能混用。`getText()` 保留文字顺序/空白，mention 用 JSON 参数表示，不会自行请求后端。自定义 getter/setter 可改变 v-model 格式，serializeMention 只改变 getText/纯文本复制，不改变标签与 v-model。

## 引用快捷键与发送热键是两套机制

| 机制 | 配置位置 | 示例 | 作用 |
| --- | --- | --- | --- |
| 字符打开引用 | mentionTriggers | 空格后 @ | 搜索 member，不发送 |
| 组合键打开引用 | mentionShortcuts | Ctrl+U、Ctrl+Shift+K | 按 source 打开分类，不发送 |
| 按钮打开引用 | captureSelection / openMention | 例子“打开成员引用” | 恢复正文选区再插入 |
| 发送热键 | 宿主 @enter 回调 | Ctrl/Cmd+Enter 或 Enter | 宿主取消换行、取 getText、调用自己的接口 |

`MentionShortcut.keys` 至少一个修饰键加单个字符；修饰键精确匹配。`prefix` 仅提供搜索上下文，默认 @，不改变分类或输出文本。默认没有引用快捷键，也没有发送热键配置 prop。

### Enter 的优先级

1. 输入法组词期间交给输入法，不发 enter、不发送。
2. 候选面板打开时 Enter 选择当前可用候选，不发 enter；loading/禁用项不可选。
3. 其余正文 Enter 发出 `enter(event, context)`；宿主同步 preventDefault 才接管。
4. 没有接管时 Enter 默认换行并续列表，空列表项退出；Shift+Enter 普通换行。

context 为 `{ inCode: false, inList: boolean }`，inCode 是兼容字段。例子的 Enter 发送模式在列表中保留换行；Ctrl/Cmd+Enter 模式允许主动发送列表正文。Shift/Alt 组合不匹配例子的发送条件，继续正常换行。

### 对接真实发送接口

```ts
async function send() {
  const text = editor.value?.getText() ?? '';
  if (!text.trim() || sending.value) return;
  sending.value = true;
  const snapshot = editor.value!.getter();
  try {
    await sendMessageToYourApi({ text, value: snapshot }); // 宿主自己实现
    // 仅当业务决定替换当前草稿时清空；异步期间允许继续输入时，勿误删新内容。
    if (JSON.stringify(editor.value?.getter()) === JSON.stringify(snapshot)) editor.value?.setter([]);
  } finally { sending.value = false; }
}
```

此片段的 editor、sending、sendMessageToYourApi 由宿主声明；完整的同步本地发送宿主见上方文件。网络失败的提示/重试由宿主处理，不会成为组件 error 事件。`event.preventDefault()` 必须在 enter 回调中同步执行，不能放到 await 网络请求之后。
