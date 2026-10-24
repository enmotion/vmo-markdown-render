# Mention 候选获取与过滤

组件通过 `search` 事件通知宿主需要哪些候选，通过 `options` 接收结果。数据获取与文字过滤是两个独立步骤：可以同步提供候选，也可以先请求数据再选择本地过滤或远端过滤。

## 先区分获取与过滤

没有 getMention/getRemoteMention 之类的内置获取方法。Input 不主动发请求，只有两个接入点：**通过 options 交付数据，通过 search 获取当前查询上下文**。

```text
字符／引用快捷键／openMention
 → search({ prefix, query, source, requestId })
 → 宿主从内存取数据，或请求接口
 → 把 MentionOption[] 赋给 options
 → 组件先隔离 source 分类，再按 filterOption 过滤
 → Enter／点击选择 → 更新 v-model，并发出 select(option, context)
```

| 你的需求 | 数据怎么来 | query 发给谁 | 配置与案例 |
| --- | --- | --- | --- |
| 本地已有全集 | 常量、store、父组件结果直接交给 options | 组件本地匹配 | [最小完整例](#本地已有全集-无需-search-回调) |
| 本地需要拼音等规则 | 与上一行相同 | 同步 filterOption 函数 | [自定义本地过滤](#自定义本地过滤) |
| 接口返回分类全集 | search 中请求，按 source 缓存 | 不发 query 给接口；组件过滤 | [远端获取后本地过滤](#异步获取后本地过滤) |
| 接口按关键词搜索 | search 中发送 source + query | 服务端过滤；组件不二次文字过滤 | [远端获取且远端过滤](#异步远端过滤) |

“同步/异步”描述获取时机；“本地/远端过滤”描述匹配在哪里发生，不能当成一个开关。远端数据也可在本地过滤；`filterOption=false` 只是关闭组件文字匹配，既不请求接口，也不自动缓存结果。

## 本地已有全集：无需 search 回调

这是可单独复制的最小 Vue 文件。`@` 只显示 member，`#` 只显示 knowledge；在已输入的半角空格后键入提示字符。默认按 label/value 做忽略大小写的包含匹配。

<ClientOnly><InputLocal /></ClientOnly>

<<< ../examples/InputLocal.vue

如果候选全集已经由页面初始化接口拿到，同样直接赋给 options 即可；不必再为每个按键重复请求。下面各例中的 search 回调，是为了按分类取数或观察查询，不是所有本地模式的必需项。

## search 的真实参数与数据映射

```ts
function search(context: MentionSearch) {
  // 首次打开：{ prefix: '@', source: 'member', query: '', requestId: 1 }
  // 查询变化：{ prefix: '@', source: 'member', query: 'ljw', requestId: 4 }
  // requestId 数字仅作示意；按该 Input 实例的每次搜索递增。
}
```

| 字段 | 含义 | 接口/持久化用途 |
| --- | --- | --- |
| prefix | 入口字符，如 @；组合键可配置，默认 @ | 仅搜索上下文，不自动拼进标签或发送文字 |
| source | 当前分类，如 member；旧 prefix 模式可为空 | 用于取数、分类隔离；选中后保存为 mention.type |
| query | 临时候选搜索词，首次为空字符串 | 远端搜索时作为关键词；不写入正文或 v-model |
| requestId | 单实例搜索编号 | 可用于丢弃旧结果；不是后端生成的 ID，也不自动发给接口 |

后端字段到候选和输出的对应关系：

```text
后端 { id: 'user-lin', label: '林见微', initials: 'ljw' }
 → 候选 { value: 'user-lin', label: '林见微', source: 'member', data: { initials: 'ljw' } }
 → v-model mention { id: 'user-lin', label: '林见微', type: 'member' }
```

必须补齐候选的 source，否则按分类打开时它不可见。`kind` 是显示提示，不代替 source；默认搜索不匹配 kind/data。数据类型、事件全部参数与最终发送示例见 [事件与热键完整案例](./input-events)。

## 模式选择

| 模式 | 获取数据 | 过滤位置 | filterOption |
| --- | --- | --- | --- |
| 同步默认 | 从内存选取分类全集 | 组件按 label / value 忽略大小写匹配 | 不传 |
| 同步自定义 | 从内存选取分类全集 | 宿主提供同步过滤函数，组件逐项调用 | 函数 |
| 异步后本地过滤 | 接口返回分类全集，宿主缓存 | 组件按当前 query 过滤 | 不传或函数 |
| 异步远端过滤 | 接口收到 source、query，返回匹配结果 | 服务端 | false |

`filterOption=false` 只关闭文字过滤。任何模式都保留严格的分类隔离：绑定 `member` 的入口只显示 `option.source === 'member'`。后端未提供 source 时，需要在宿主适配阶段补上。

## 共享数据与触发配置

以下所有示例的 `input-data.ts` 文件：

<<< ../examples/input-data.ts

`requestCandidates` 是可运行的延时模拟服务，不访问真实服务器。它不传 query 时返回分类全集，传 query 时模拟服务端过滤。对接真实接口的方式见本页后文。

- `MentionOption.value` 对应节点 `content.id`。
- `MentionOption.label` 是标签显示名称。
- `MentionOption.source` 对应节点 `content.type`，也是入口分类。
- `MentionOption.kind` 只用于候选项的辅助展示；不会作为节点业务分类保存。
- `data` 为宿主提供的附加信息，例如首字母。组件没有内置拼音转换，默认过滤不读取 data。

## 同步候选与默认本地过滤

在 `search` 中同步设置当前分类全集，不传 `filterOption`。组件按照 query 对 label / value 做不区分大小写的包含匹配。

<script setup>
import InputLocal from "../examples/InputLocal.vue";
import InputSync from '../examples/InputSync.vue';
import InputAsyncLocal from '../examples/InputAsyncLocal.vue';
import InputRemote from '../examples/InputRemote.vue';
import InputLegacyPrefix from '../examples/InputLegacyPrefix.vue';
</script>

<ClientOnly><InputSync /></ClientOnly>

<<< ../examples/InputSync.vue

输入正文中的半角空格后输入 `@`，或按 `Ctrl+U`，或点“选择成员”。查询词只存在于候选搜索框，不写入正文、v-model 或撤销历史。

## 自定义本地过滤

上例勾选“自定义首字母过滤”后，传入 `matchInitials`。签名为：

```ts
(query: string, option: MentionOption, prefix: string) => boolean
```

第三个参数是这次入口的提示字符，可按字符选择规则；分类通过 `option.source` 获取。函数同步返回 boolean，不要在过滤函数内发请求。远端请求放在 `search` 事件中。

```vue
<MarkdownInput :options="options" :filter-option="matchInitials" @search="search" />
```

把属性设回 `undefined` 恢复默认本地过滤；设为 `false` 是关闭文字过滤，两者含义不同。

## 异步获取后本地过滤

接口按分类返回完整候选，查询字符不发送给接口。示例按 source 缓存请求 Promise，查询词变化时复用同一份全集，并由组件应用最新 query。

<ClientOnly><InputAsyncLocal /></ClientOnly>

<<< ../examples/InputAsyncLocal.vue

失败的缓存会被删除，重新打开分类即可重试。`latest` 防止较慢的旧分类响应覆盖当前结果，finally 中也检查序号，避免旧请求提前关闭 loading。真实业务可按权限/数据更新时间清理缓存；分页结果只是局部数据，不能当作完整全集做全量本地搜索。

## 异步远端过滤

设置 `:filter-option="false"`，把 source 和 query 传给接口，直接显示接口结果。示例远端支持 `ljw` / `swt`，尽管候选名称/value 不包含这些首字母，也不会被组件二次过滤掉。

<ClientOnly><InputRemote /></ClientOnly>

<<< ../examples/InputRemote.vue

组件没有自动请求、防抖或请求取消。示例使用递增序号防止旧响应覆盖；需要减少请求频率时，可在宿主增加防抖或 AbortController。面板关闭不会发出独立 close 事件；每次新搜索都会有新的 requestId。

### 替换为真实 HTTP 接口

将共享文件的 `requestCandidates` 换成下面的实现，后端约定响应为 `{ id, label, initials? }[]`。路径 `/api/mention-options` 是示例接口，需要由宿主实现。

<<< ../examples/mention-http.ts

本地过滤模式的接口应返回分类全集；远端模式的接口应在服务端应用 query。服务端仍负责身份/权限与入参校验。网络失败应在 search 回调中处理；组件 `error` 事件报告的是 getter/setter 转换异常，不接管宿主请求错误。

### 真实 HTTP：防抖、取消、竞态与重试

前面的 InputRemote.vue 使用本地延时模拟服务，方便在文档中直接体验；它不访问服务器。下面是实际接入文件，配合上方 mention-http.ts 使用，不在文档中自动运行不存在的接口：

<<< ../examples/InputHttpRemote.vue

接口契约示例：

```http
GET /api/mention-options?source=member&query=ljw
```

```json
[
  { "id": "user-lin", "label": "林见微", "initials": "ljw" }
]
```

- 200ms 防抖发生在宿主，不是 Input 内置能力；空 query 也会请求首次候选。
- 新查询先清旧候选，AbortController 取消旧请求，同时用 generation 防止取消不及时的旧结果/错误/finally 回写。
- 组件 requestId 标识搜索事件；宿主重试同一事件时另用 generation，不要求后端返回 requestId。
- 请求失败由宿主 error 文案展示，重试按钮复用最后一次查询；组件 error 事件只处理 getter/setter。
- 卸载时清计时器并取消请求。面板关闭没有单独 close 事件，不能拿正文 blur 当 close；请求完成可更新已关闭面板的候选，但新查询会清空并重新取数。
- 后端若返回 `{ items: [...] }` 或数字 ID，请在适配函数中显式拆包/转换；示例严格接收上面的字符串 id/label 数组，并补齐 source。

### 怎样判断接法选错了

| 现象 | 常见原因 | 修正 |
| --- | --- | --- |
| 接口有结果，面板却空 | source 缺失/不匹配；或远端结果被默认文字过滤 | 补齐 source；远端模式设 filterOption=false |
| 输入 ljw 找不到中文名 | 默认只查 label/value，不查拼音或 data | 使用自定义本地函数，或让服务端搜索 |
| 每个字都重新下载全集 | 全集获取与关键词搜索混用 | 远端全集模式按 source 缓存 |
| 快速改词后出现旧结果 | 旧请求覆盖新请求 | 请求序号/generation 检查，并可取消旧请求 |
| 候选词出现在发送内容 | 把临时 query 手动拼进 v-model | query 仅用于搜索；选择后让 Input 插入 mention |
| 想做服务端分页 | 把某页当成全集并启用本地搜索 | 服务端按 query 搜索，宿主管理分页；组件没有自动分页事件 |

## 字符与组合键规则

```ts
import type { MentionTrigger, MentionShortcut } from 'vmo-markdown-render';
const triggers: MentionTrigger[] = [
  { character: '@', source: 'member' },
  { character: '#', source: 'knowledge' },
  { character: '/', source: 'agent' },
];
const shortcuts: MentionShortcut[] = [
  { source: 'member', keys: { ctrl: true, key: 'u' } },
  { source: 'knowledge', keys: { meta: true, shift: true, key: 'k' }, prefix: '#' },
];
```

字符必须是单个非空白可打印字符；触发时光标前一个字符严格为半角空格 U+0020。正文开头、换行、Tab、全角空格不满足条件，不扫描已有正文重新触发。`#` 可作为 mention 入口；Input 不支持 Markdown 标题。

组合键必须包含至少一个修饰键与单个字符键，所有修饰键精确匹配；冲突时首条有效配置优先。示例 `Ctrl+U` 不会被 `Ctrl+Shift+U` 触发。部分系统快捷键可能被操作系统截获；移动端建议使用宿主的按钮调用 `openMention(source)`。

`MentionShortcut.prefix` 只影响搜索上下文中的 prefix，默认 `@`，不改变标签 label 或发送 JSON。分类从 source 决定。

## 候选操作与搜索事件

- 打开面板时触发一次空 query 搜索；查询词变化继续触发，每次 requestId 递增。
- 输入法组词期间不触发过滤/搜索，组词结束后应用查询。
- Enter 选择当前可用候选；上下键在非禁用项间循环。
- 空格或 Esc 取消搜索；空格被消费，不进入正文。字符触发时已输入的提示字符保留，临时查询词丢弃。
- 查询框 Backspace 仅删除查询词；查询为空时不删除正文。
- 选中候选后，字符入口替换提示字符，组合键/按钮入口在原选区插入标签，并追加一个空格。
- disabled 候选不可选；loading 时也不可选。

## 兼容的无分类 prefix

仅兼容旧接入方式。prefix 可以是字符串或字符串数组，不绑定 source，仍要求半角空格前置。新业务优先使用 mentionTriggers。

<ClientOnly><InputLegacyPrefix /></ClientOnly>

<<< ../examples/InputLegacyPrefix.vue
