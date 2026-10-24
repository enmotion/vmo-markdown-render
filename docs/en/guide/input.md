# Input data, sending, and persistence

Candidate loading, filtering, event payloads and keyboard policies are separate concerns. Follow [four loading/filtering modes](./input-mentions) → [events and send-key examples](./input-events) for complete runnable examples and visible event logs.

MarkdownInput is an input field. It owns editing, lightweight formatting, mention tags, and candidate interaction. The host owns send buttons, keyboard send policies, chat requests, toolbars, and attachment previews.

## Default value protocol

```ts
import { ref } from 'vue';
import type { InputValue } from 'vmo-markdown-render';
const value = ref<InputValue>([
  { type: 'text', content: 'Ask ' },
  { label: 'Alice', id: 'user-alice', type: 'member' },
  { type: 'text', content: ' to summarize.' },
]);
```

Default v-model and getter() values are arrays. Text uses `{ type: 'text', content }`; a mention is flattened to `{ label, id, type? }`. Its type is a business category, not an outer node discriminator.

Internal nodes have the following structure:

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
interface InputDocument { version: 1; nodes: (InputTextNode | InputMentionNode)[] }
```

label/id are required; type/data are optional. Default external arrays omit data. Restoring those arrays therefore does not restore data. Rehydrate it from host data by type/id, or use custom getter/setter functions when persistence requires it.

## Getter and setter methods

```ts
const snapshot = editor.value?.getter();
if (snapshot !== undefined) editor.value?.setter(snapshot);
```

- getter() returns the default array or custom conversion result without editing content.
- setter(value) replaces content, updates v-model, and resets undo history. During IME composition, replacement is deferred.
- Ordinary v-model echoes do not recreate tags, change selection, or reset history.
- The default setter also accepts a string as plain text. It does not infer mentions from JSON literals or @names.

For storage, the host can JSON.stringify the snapshot and JSON.parse it before restoring. This is host storage serialization; the default component protocol does not URI-encode text.

## Final send text

Call getText() from the host to obtain:

```text
Ask {"label":"Alice","id":"user-alice","type":"member"} to summarize.
```

Mentions become JSON containing label, id, and type when present. data and internal content/version/nodes wrappers are omitted. Ordinary text, spaces, newlines, and order are preserved. Quotes and backslashes use standard JSON serialization, not URI encoding.

serializeMention changes only send/plain-clipboard text, leaving tags and v-model unchanged:

```vue
<MarkdownInput :serialize-mention="node => node.content.label" />
```

This override returns only the label. Omit it to retain parameter JSON.

## Host sending, events, and save/restore

This complete example covers every Input event, all candidate slots, and the main instance methods. It uses the shared Chinese candidate data for initials matching.

<script setup>
import InputChat from '../../examples/InputChat.vue';
import InputCodec from '../../examples/InputCodec.vue';
</script>

<ClientOnly><InputChat /></ClientOnly>

<<< ../../examples/InputChat.vue

The host decides empty-content checks, requests, success reporting, and clearing. The example displays messages locally. With a real API, clear the editor after success according to your application's policy.

### Newlines and send keys

The component does not require a combination to insert a newline:

| Key | Default behavior |
| --- | --- |
| Enter | Newline; continue a list or exit an empty item |
| Shift+Enter | Ordinary newline without a new list marker |
| Enter while candidates are open | Select the active enabled item; no host enter event |
| Enter during IME composition | Leave it to the input method; do not send |

Cancel enter(event, context) with event.preventDefault() to take over newline handling. The example supports button-only, Ctrl/Cmd+Enter, or Enter sending. context.inList helps preserve list editing; the compatibility field inCode is currently always false because Input does not support code regions.

## Custom getter/setter

Omit these props for the default behavior. Configure synchronous functions only for a different persistence format; do not request data inside them.

<ClientOnly><InputCodec /></ClientOnly>

<<< ../../examples/InputCodec.vue

This example saves the complete internal document as a JSON string to retain data. It is not the default array protocol or getText format. The exported defaultInputCodec.encode/decode helpers provide the default conversion.

A setter exception or invalid document triggers a decode error. String input falls back to plain text; other invalid input falls back to empty content. A getter exception or non-array/non-string result triggers an encode error and falls back to the default array. Override error messages through i18n. Restored nodes are validated; persistent data should be JSON-serializable, without functions or cycles.

## Editing syntax and clipboard

Input supports ASCII `**bold**`, `*italic*`, leading `- ` unordered lists, and `1. ` ordered lists. Complete structures render immediately without reverting on focus/selection. Breaking the syntax by editing reveals the remaining source. Enter continues the same marker and increments ordered numbering; it does not renumber existing items.

Underscore emphasis, strikethrough, code, quotes, headings, tables, links, and media syntax do not create corresponding editor structures. + and * do not create unordered lists. Input does not create image/audio/video or business component containers. MarkdownRender supports a broader display protocol than Input's editing subset.

Copy writes both parameter-JSON/plain text and a private node format. The private format preserves tags and internal data. If another application removes it, paste uses ordinary text and does not infer mentions. History stores at most 100 editing snapshots.
