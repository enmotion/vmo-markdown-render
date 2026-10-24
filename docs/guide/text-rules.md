# 正则规则

`textRules` 在 Markdown 解析后的正文文本节点上运行。规则可以返回纯文本、VNode，或渲染业务组件。

## 字符串替换

```ts
import type { TextRule } from 'vmo-markdown-render';

const textRules: TextRule[] = [
  { pattern: /ORDER-(\d+)/g, replace: '订单 $1' },
  { pattern: /(?<kind>VIP)-(\d+)/g, replace: '$<kind> 用户：$2' },
];
```

通过 `<MarkdownRender :content="content" :text-rules="textRules" />` 使用。

| 占位符 | 含义 |
| --- | --- |
| `$$` | 字面量 `$` |
| `$&` | 完整匹配 |
| `$1`～`$99` | 对应捕获组；合法但未参与的组替换为空字符串 |
| `$<name>` | 命名捕获组；缺失时为空字符串 |

不存在的数字捕获组保留占位符原样。不支持原生 `String.replace` 的前文、后文占位符，不能直接假设所有原生替换语义相同。

## 回调与上下文

```ts
const textRules: TextRule[] = [
  {
    pattern: /PRICE-(\d+)/g,
    replace: ({ captures }) => `¥${Number(captures[0]).toFixed(2)}`,
  },
];
```

| TextMatch 字段 | 类型 | 含义 |
| --- | --- | --- |
| match | `string` | 完整命中 |
| captures | `readonly (string \| undefined)[]` | 捕获组，不含完整匹配 |
| offset | `number` | 当前正文节点内的偏移，不是原始 Markdown 的全局偏移 |
| input | `string` | 当前正文文本节点 |
| groups | `Readonly<Record<string, string \| undefined>>`，可选 | 命名分组 |

回调返回的字符串按纯文本显示：`**加粗**`、HTML 或业务标签不会再次解析，也不会再次参与正则匹配。

## 输出组件或 VNode

```ts
import { h } from 'vue';
import type { TextRule } from 'vmo-markdown-render';
import OrderLink from './OrderLink.vue';
import UserBadge from './UserBadge.vue';

const textRules: TextRule[] = [
  {
    pattern: /ORDER-(\d+)/g,
    component: OrderLink,
    props: ({ captures }) => ({
      orderId: Number(captures[0]),
      onOpen: (id: number) => console.log('打开订单', id),
    }),
  },
  {
    pattern: /USER-(\w+)/g,
    replace: ({ captures }) => h(UserBadge, { name: captures[0] }),
  },
];
```

`props` 也可直接使用固定对象。每条规则二选一：`replace` 或 `component`，不能同时配置；组件不需要再放入 `components` 注册表。`replace` 回调只允许返回字符串或单个 VNode。组件可使用 provide/inject；正文中的组件应采用行内根元素。

## 多规则顺序与重叠

所有规则独立匹配同一份原始节点文本，再按起点从左到右处理；同起点按数组顺序优先，**不是最长匹配优先**。已消费区间内的后续候选会被跳过。

例如输入 `ORDER-42 USER-alice`：

```ts
const textRules: TextRule[] = [
  { pattern: /ORDER-\d+/, replace: '订单' },
  { pattern: /ORDER-42/, replace: '特定订单' },
  { pattern: /USER-\w+/, replace: '用户' },
];
// 结果：订单 用户
```

前两条同起点，首条胜出；第三条在后续位置命中。输出不会继续被其他规则处理。

引擎克隆正则、移除 `g/y` 后添加 `g`，不修改调用方 `lastIndex`。即使不写 `g` 也会匹配当前节点内的多个位置；`y` 不提供粘连匹配语义；其他 flags 保留。

## 匹配范围

规则适用于正文，包括标题、列表、表格和链接显示文本；跳过行内代码、代码块、公式、链接 URL、图片属性、组件属性与组件插槽正文。不跨 Markdown 文本节点匹配。

例如 `ORDER-**42**` 被拆为不同节点，`/ORDER-42/` 不会命中；`[ORDER-42](https://example.com/ORDER-42)` 只替换显示文本，不改 URL。用于目录的标题信息来自解析结果，不会因正则替换而同步改名。

流式期间无法推断任意正则的完成条件。`/ORDER-\d+/` 在仅收到 `ORDER-4` 时就可能挂载组件，后续变成 `ORDER-42` 会更新 props；需要等完整标识再触发业务行为时，应设计明确结束符，例如 `/\[order:(\d+)\]/g`，输入 `[order:42]`。

## 错误与处理上限

- 零长度命中会报告 `text-rule` 错误并停止当前规则的后续扫描；此前已收集的有效候选仍可参与处理。
- 无效正则或匹配执行失败会报告错误，其他规则继续处理。
- 替换或 props 回调抛错时保留该次原文，并报告对应的零起始 `ruleIndex`。
- 单节点超过 100,000 字符、规则超过 100 条，或候选超过 10,000 个时，该节点保留原文并报告错误。候选数量在消除重叠前计算。

这些上限不能阻止正则本身的灾难性回溯。规则由宿主代码配置，避免将未经控制的复杂正则直接用于长文本。
