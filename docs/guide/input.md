# Input 数据、发送与草稿

`MarkdownInput` 是一个输入框。组件负责编辑、轻量排版、mention 标签和候选交互。发送按钮、快捷发送策略、聊天接口、工具栏以及附件预览都由宿主组装。

## 默认数据协议

```ts
import { ref } from 'vue';
import type { InputValue } from 'vmo-markdown-render';
const value = ref<InputValue>([
  { type: 'text', content: '请让 ' },
  { label: '林见微', id: 'user-lin', type: 'member' },
  { type: 'text', content: ' 总结。' },
]);
```

默认 v-model 与 `getter()` 返回节点数组。文字使用 `{ type: 'text', content }`；mention 对外展平为 `{ label, id, type? }`。mention 的 type 是业务分类，不是外层节点判别字段。

内部节点由组件维护，结构如下：

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
interface InputDocument {
  version: 1;
  nodes: (InputTextNode | InputMentionNode)[];
}
```

`label`、`id` 必填；`type`、`data` 可选。默认对外数组不包含 data，所以使用默认数组保存恢复后，data 也不再存在。需要保留 data 时可按 `type + id` 从宿主业务数据补齐，或使用自定义 getter/setter。

## getter 与 setter

```ts
const snapshot = editor.value?.getter();
if (snapshot !== undefined) editor.value?.setter(snapshot);
```

- `getter()` 获取默认数组或自定义转换的结果，不修改编辑状态。
- `setter(value)` 替换编辑内容并同步 v-model。替换重置撤销历史；输入法组词期间延后应用。
- 正常 v-model 回写不会重建标签、改变选区或清空历史。
- 默认 setter 也接受字符串，把它当作普通文字，不从 JSON 字面量或 `@名称` 推断标签。

宿主保存时可以 `JSON.stringify(snapshot)` 写入存储，恢复时先 `JSON.parse` 再传给 setter。这个存储序列化是宿主行为，组件默认没有 URI 编码协议。

## 最终发送文字

宿主调用 `getText()` 获取字符串：

```text
请让 {"label":"林见微","id":"user-lin","type":"member"} 总结。
```

mention 默认序列化为 label、id、存在时的 type；不包含 data、外层 content 或 version/nodes。正文、空格、换行和节点顺序保留。引号与反斜线按标准 JSON 序列化，不做 URI 编码。缺省 type 时省略该字段。

`serializeMention` 只改变发送/纯文本复制表达，不改变标签与 v-model：

```vue
<MarkdownInput :serialize-mention="node => node.content.label" />
```

示例只输出名称；默认不传时保留 JSON 参数。

## 外部发送、事件与保存恢复

这个完整用例同时展示全部 Input 事件、候选插槽和主要实例方法：

<script setup>
import InputChat from '../examples/InputChat.vue';
import InputCodec from '../examples/InputCodec.vue';
</script>

<ClientOnly><InputChat /></ClientOnly>

<<< ../examples/InputChat.vue

发送流程中，宿主决定空内容判断、请求、成功提示和清空时机。示例在本地展示发送字符串；接入真实接口时，应在请求成功后按业务需求清空。

### 换行与发送按键

组件默认 Enter 换行，不要求组合键：

| 按键 | 默认行为 |
| --- | --- |
| Enter | 普通换行；列表中续项，空列表项退出列表 |
| Shift+Enter | 普通换行，不生成新的列表标记 |
| 候选打开时 Enter | 选择当前可用候选，不触发宿主 enter |
| 输入法组词时 Enter | 交给输入法，不触发发送 |

宿主监听 `enter(event, context)` 并调用 `event.preventDefault()` 才接管默认换行。示例提供“仅按钮”“Ctrl/Cmd+Enter”“Enter”三种发送策略。context.inList 帮助避免在编辑列表时误发送；兼容字段 inCode 当前固定 false，因为 Input 不支持代码区域。

## 自定义 getter/setter

默认函数可以省略。确需自己的持久化格式时再配置，转换是同步操作，不在函数中发请求。

<ClientOnly><InputCodec /></ClientOnly>

<<< ../examples/InputCodec.vue

示例将整个内部 document 保存为 JSON 字符串，用于演示保留 data 的特殊需求；这不是默认数组协议，也不是 getText 的发送格式。可调用导出的 `defaultInputCodec.encode/decode` 复用默认转换。

setter 抛错或返回非法 document 时触发 `error({ stage: 'decode', message })`：字符串降级为普通文字，其他无效值降级为空内容。getter 抛错或返回非数组/字符串时触发 encode 错误，回退默认数组。错误提示可以通过 i18n 覆盖。恢复的数据仍会经过节点校验；data 应可 JSON 序列化，函数、循环引用等不适合持久化。

## 编辑语法与复制

仅支持英文半角语法标记：`**重点**`、`*斜体*`、行首 `- ` 无序列表与 `1. ` 有序列表。完整结构即时渲染，选中/聚焦不切回源码；删除破坏结构后才显示残缺原文。列表 Enter 自动续写当前标记，有序列表递增，但不会重排已有序号。

下划线强调、删除线、代码、引用、标题、表格、链接与媒体语法不生成相应编辑组件。`+ ` / `* ` 不作为无序列表。Input 不提供图片/音视频/业务组件容器；`MarkdownRender` 的完整语法支持不等于 Input 的编辑范围。

复制同时写入参数 JSON 拼接的纯文本，以及应用内私有节点格式；私有格式可保留标签与内部 data。外部应用移除私有格式时，粘贴按普通文字处理，不推断 mention。编辑器内历史最多保存 100 次编辑。
