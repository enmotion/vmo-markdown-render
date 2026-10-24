# Input events, mention shortcuts and send keys

See [candidate loading/filtering](./input-mentions) for the four data modes. This page explains callback arguments, serialized output and whether Enter selects, inserts a newline or sends.

## Complete runnable event example

This shared Vue file demonstrates all eight event types, two mention categories, three send policies and visible argument logs. It sends only to an in-memory list, not a chat endpoint. Chinese labels are shared with the Chinese examples; the types/behavior are identical.

<script setup>
import InputEvents from '../../examples/InputEvents.vue';
</script>

<ClientOnly><InputEvents /></ClientOnly>

<<< ../../examples/InputEvents.vue

Click “打开成员引用”, type 林 in the query field, press Enter to select, type a message in the editor and press Ctrl/Cmd+Enter. Inspect search, update:modelValue, select, enter and host-send separately. Delete the tag to inspect mention-remove. args is the example's array of callback arguments, not an extra wrapper emitted by Input. host-send is a host log, not an Input event.

## Callback arguments

| Event | Arguments | Distinction |
| --- | --- | --- |
| update:modelValue | `(value: InputValue)` | Data, not a DOM InputEvent; v-model already listens |
| search | `(context: MentionSearch)` | Query context, not results or an automatic request |
| select | `(option: MentionOption, context: MentionSearch)` | Two arguments, not `{ option, context }` |
| mention-remove | `(node: InputMentionNode)` | Internal node; identity is in node.content |
| enter | `(event: KeyboardEvent, context: InputEnterContext)` | Not an already-sent message; preventDefault synchronously |
| error | `({ stage: 'encode' or 'decode', message })` | Codec failures, not host HTTP errors |
| focus | `(event: FocusEvent)` | Editor focus; the log projects type for JSON display |
| blur | `(event: FocusEvent)` | Moving into the internal search field also blurs the editor; not a panel-close event |

```ts
function selected(option: MentionOption, context: MentionSearch) {
  // option: { value:'user-lin', label:'林见微', source:'member', data:{ initials:'ljw' } }
  // context: { prefix:'@', query:'林', source:'member', requestId:2 }
}
function removed(node: InputMentionNode) {
  // { type:'mention', content:{ id:'user-lin', label:'林见微', type:'member', data:{ initials:'ljw' } } }
}
```

Import types from vmo-markdown-render. Opening emits an empty-query search; later queries increment requestId per instance. Selection returns that query's context and updates v-model. Do not assume a fixed global ordering for browser focus/blur events. There is no separate close, submit or send event.

## Three different outputs

```ts
// v-model / update:modelValue / getter(): default external array
[
  { type: 'text', content: 'Ask ' },
  { label: '林见微', id: 'user-lin', type: 'member' },
  { type: 'text', content: ' to summarize' },
]
// select: original option plus search context, as above
// getText(): a string for sending/plain-text copying
'Ask {"label":"林见微","id":"user-lin","type":"member"} to summarize'
```

External mentions have no outer type:'mention'/content and omit data. mention-remove uses the internal format. getText preserves text order/whitespace and serializes mention identities as JSON; it does not send anything. Custom getter/setter may change the model format. serializeMention changes getText/plain-text copying only.

## Mention shortcuts versus sending

| Mechanism | Configuration | Example | Action |
| --- | --- | --- | --- |
| Character trigger | mentionTriggers | ASCII space then @ | Open member candidates |
| Mention hotkey | mentionShortcuts | Ctrl+U, Ctrl+Shift+K | Open a category, not send |
| Mention button | captureSelection / openMention | Example button | Restore editor selection before insertion |
| Send key | Host @enter handler | Ctrl/Cmd+Enter or Enter | Cancel newline, read getText and call the host API |

Shortcut keys require a modifier plus one character and match modifiers exactly. prefix is search context, defaults to @ and does not alter category/output. No mention shortcuts are enabled by default; there is no send-key prop.

### Enter priority

1. IME composition consumes Enter without enter/send.
2. An open candidate panel consumes Enter for selection; loading/disabled entries cannot be selected.
3. Otherwise the editor emits enter(event, context). The host must synchronously preventDefault to take over.
4. Without takeover, Enter inserts a newline/continues a list; empty items exit. Shift+Enter inserts an ordinary newline.

context is `{ inCode: false, inList: boolean }`; inCode is retained for compatibility. The example's plain-Enter send policy preserves list editing, while explicit Ctrl/Cmd+Enter may send list content. Shift/Alt combinations do not match its send conditions.

### A real send API

```ts
async function send() {
  const text = editor.value?.getText() ?? '';
  if (!text.trim() || sending.value) return;
  sending.value = true;
  const snapshot = editor.value!.getter();
  try {
    await sendMessageToYourApi({ text, value: snapshot });
    if (JSON.stringify(editor.value?.getter()) === JSON.stringify(snapshot)) editor.value?.setter([]);
  } finally { sending.value = false; }
}
```

The host supplies editor, sending and sendMessageToYourApi. The complete local-send example above needs no endpoint. If users may keep typing during a request, avoid clearing a newer draft. Handle request errors/retries in the host, not Input's codec error event. Cancel the keyboard default before awaiting the request.
