# Mention 候选获取与过滤

组件通过 `search` 事件通知宿主需要哪些候选，通过 `options` 接收结果。数据获取与文字过滤是两个独立步骤：可以同步提供候选，也可以先请求数据再选择本地过滤或远端过滤。

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
