# Text rules

textRules run on body text nodes after Markdown parsing. They may produce plain text, one VNode, or a business component.

## String replacements

```ts
import type { TextRule } from 'vmo-markdown-render';
const textRules: TextRule[] = [
  { pattern: /ORDER-(\d+)/g, replace: 'Order $1' },
  { pattern: /(?<kind>VIP)-(\d+)/g, replace: '$<kind> user: $2' },
];
```

Pass these through `<MarkdownRender :content="content" :text-rules="textRules" />`.

| Placeholder | Meaning |
| --- | --- |
| `$$` | Literal dollar sign |
| `$&` | Complete match |
| `$1`–`$99` | Captured group; an existing but unmatched group becomes empty |
| `$<name>` | Named group; missing values become empty |

Nonexistent numeric groups keep their literal placeholder. Native replacement prefix/suffix placeholders are not supported; do not assume all String.replace semantics apply.

## Callback context

```ts
const textRules: TextRule[] = [
  { pattern: /PRICE-(\d+)/g, replace: ({ captures }) => `$${Number(captures[0]).toFixed(2)}` },
];
```

| TextMatch field | Type | Meaning |
| --- | --- | --- |
| match | string | Complete match |
| captures | readonly (string or undefined)[] | Groups, without the full match |
| offset | number | Offset in the current body node, not the complete Markdown source |
| input | string | Current text node |
| groups | Optional named-group map | Named captures |

Returned strings are displayed literally. Markdown/HTML/business tags in a replacement are not reparsed or matched again.

## Components and VNodes

```ts
import { h } from 'vue';
import type { TextRule } from 'vmo-markdown-render';
import OrderLink from './OrderLink.vue';
import UserBadge from './UserBadge.vue';
const textRules: TextRule[] = [
  {
    pattern: /ORDER-(\d+)/g,
    component: OrderLink,
    props: ({ captures }) => ({ orderId: Number(captures[0]), onOpen: (id: number) => console.log(id) }),
  },
  { pattern: /USER-(\w+)/g, replace: ({ captures }) => h(UserBadge, { name: captures[0] }) },
];
```

props may also be a fixed object. Choose replace or component, never both. Rule components need not also be registered in components. A replace callback returns a string or a single VNode. Components can use provide/inject; use inline roots inside body text.

## Ordering and overlap

Rules independently scan the original node text. Candidates are processed left-to-right; equal starting positions prefer the earlier rule, not the longest match. Consumed ranges suppress overlapping candidates. Outputs are not processed by later rules.

```ts
const textRules: TextRule[] = [
  { pattern: /ORDER-\d+/, replace: 'Order' },
  { pattern: /ORDER-42/, replace: 'Specific order' },
  { pattern: /USER-\w+/, replace: 'User' },
];
// ORDER-42 USER-alice -> Order User
```

The engine clones regexes, removes g/y, then adds g. The caller's lastIndex is unchanged. Missing g still permits multiple matches; y does not retain sticky semantics. Other flags are retained.

## Matching boundaries

Rules process body text in headings, lists, tables, and link labels. They skip code, math, URLs, image attributes, business attributes, and component slot bodies. They do not span Markdown text nodes.

ORDER-**42** is split across nodes and will not match /ORDER-42/. In `[ORDER-42](https://example.com/ORDER-42)`, only the visible text changes. TOC heading metadata is not renamed by replacements.

Streaming cannot infer when an arbitrary regex is complete. /ORDER-\d+/ can match ORDER-4 before a later 2 arrives. For business behavior requiring a complete ID, use an explicit delimiter such as `/\[order:(\d+)\]/g` and `[order:42]`.

## Errors and limits

- A zero-length match reports text-rule and stops further scanning for that rule. Earlier valid candidates remain eligible.
- Invalid regexes or execution failures report an error while other rules continue.
- Replacement/props exceptions preserve the matched source and report a zero-based ruleIndex.
- More than 100,000 characters in a node, 100 rules, or 10,000 candidates preserves that node and reports an error. Candidates are counted before overlap removal.

These limits do not prevent catastrophic regex backtracking. Keep host-provided patterns suitable for long text. When instructing a model, document your actual textRules separately; do not assume a built-in business identifier format.
