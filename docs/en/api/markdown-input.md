# MarkdownInput API

Import MarkdownInput from vmo-markdown-render and load vmo-markdown-render/style.css. [Quick start](../guide/getting-started) provides a complete host. [Candidate loading](../guide/input-mentions) covers synchronous/asynchronous and local/remote filtering.

## Content font size cap

```vue
<MarkdownInput :font-base-size="32" style="--md-font-max-size: 24px" />
```

The editor, placeholder, mentions and menu use a capped 24px base size. Render shares this variable; set it on each instance or their common ancestor. No cap applies by default. Use a positive px/rem length. The former `--md-heading-max-size` variable has been removed. See [Themes and sizes](../guide/theme#content-font-size-limits-and-headings).

## Props

Use kebab-case in templates and camelCase in TypeScript.

| Prop | Type | Default | Description / example |
| --- | --- | --- | --- |
| modelValue | `InputValue` | `[]` | Default text/mention array; [data](../guide/input#default-value-protocol) |
| getter | `InputGetter` | Default array exporter | Convert internal document to an array/custom string; [custom conversion](../guide/input#custom-getter-setter) |
| setter | `InputSetter` | Default importer | Convert an external array/string to a document; same example |
| prefix | `string \| readonly string[]` | `[]` | Legacy unclassified character triggers; [example](../guide/input-mentions#legacy-unclassified-prefix) |
| mentionTriggers | `readonly MentionTrigger[]` | `[]` | Character/category bindings; ASCII space required; [example](../guide/input-mentions#synchronous-candidates-and-default-local-filtering) |
| mentionShortcuts | `readonly MentionShortcut[]` | `[]` | Exact modifier/key/category bindings; [rules](../guide/input-mentions#character-and-shortcut-rules) |
| options | `readonly MentionOption[]` | `[]` | Host-provided candidates; [loading modes](../guide/input-mentions) |
| loading | `boolean` | `false` | Loading status and selection guard; [async example](../guide/input-mentions#asynchronous-loading-with-local-filtering) |
| filterOption | `false \| ((query, option, prefix) => boolean)` | Label/value filter | false disables text filtering but not source isolation; [local](../guide/input-mentions#custom-local-filtering) / [remote](../guide/input-mentions#asynchronous-remote-filtering) |
| placement | `MentionPlacement` | `'auto'` | auto/top/bottom preference and collision handling; [example](../guide/input-configuration#desktop-popovers-and-mobile-sheets) |
| offset | `number` | `6` | Caret gap in px; invalid values fall back to 6; same example |
| mobilePlacement | `MentionMobilePlacement` | `'bottom-sheet'` | bottom-sheet/caret, 600px breakpoint; same example |
| i18n | `Partial<InputI18n>` | Chinese defaults | Partial text overrides; [all keys](../guide/input-configuration#i18n-external-key-value-overrides) |
| placeholder | `string` | `i18n.placeholder` | Explicit prop wins; empty strings are allowed; [configuration](../guide/input-configuration#complete-configuration-example) |
| disabled | `boolean` | `false` | Prevent user editing/candidate opening; tabindex=-1; same example |
| readonly | `boolean` | `false` | Read-only user interaction, no tag deletion buttons; same example |
| theme | `'' \| 'light' \| 'dark' \| 'auto'` | `''` | Host/in-instance/system theme; [example](../guide/input-configuration#theme-font-size-and-background) |
| fontBaseSize | `number` | `12` | px; invalid values fall back to 12; same example |
| themeColors | `ThemeColors` | No overrides | Light/dark base colors and five semantic colors; same example |
| unstyled | `boolean` | `false` | Remove default visuals, retain behavior; [configuration](../guide/input-configuration#complete-configuration-example) |
| serializeMention | `(node: InputMentionNode) => string` | Parameter JSON | Customize send/plain-clipboard text; [example](../guide/input#final-send-text) |

The full predicate is `(query: string, option: MentionOption, prefix: string) => boolean`. It must return synchronously. Getter/setter functions are synchronous conversions, not request handlers. Undeclared attributes such as class/style fall through to the root.

## Emits

The [complete host example](../guide/input#host-sending-events-and-save-restore) registers every event below.

| Event | Arguments | Meaning |
| --- | --- | --- |
| update:modelValue | `(value: InputValue)` | After editing, undo/redo, or instance setter; v-model subscribes automatically |
| search | `(context: MentionSearch)` | On opening/query changes, after composition; increasing requestId |
| select | `(option: MentionOption, context: MentionSearch)` | After a candidate is inserted |
| mention-remove | `(node: InputMentionNode)` | After deletion by editing/button; business data is in content |
| enter | `(event: KeyboardEvent, context: InputEnterContext)` | Unconsumed Enter; preventDefault overrides newline |
| error | `(error: InputCodecError)` | Invalid getter/setter result or exception, not host request failures |
| focus | `(event: FocusEvent)` | Main editor focused |
| blur | `(event: FocusEvent)` | Main editor blurred, including movement into the search input |

```ts
interface MentionSearch { prefix: string; query: string; source?: string; requestId: number }
interface InputEnterContext { inCode: boolean; inList: boolean }
interface InputCodecError { stage: 'encode' | 'decode'; message: string }
```

There is no submit/send event or send prop. inCode is a compatibility field, currently false. Selecting a mention appends one space. There is no separate close event. Updating i18n or positioning does not initiate search.

## Instance methods

```ts
import { ref } from 'vue';
import { MarkdownInput } from 'vmo-markdown-render';
const editor = ref<InstanceType<typeof MarkdownInput>>();
```

| Method | Signature | Behavior / example |
| --- | --- | --- |
| getter | `() => InputValue` | Array/custom value; [save/restore](../guide/input#host-sending-events-and-save-restore) |
| setter | `(value: InputValue) => void` | Replace content/update v-model/reset history; same example |
| getText | `() => string` | Text with mention parameter JSON; [format](../guide/input#final-send-text) |
| focus | `() => void` | Focus editor at the end; [host example](../guide/input#host-sending-events-and-save-restore) |
| blur | `() => void` | Blur the main editor; same example |
| insertText | `(text: string) => void` | Insert plain text at the current selection if editable; same example |
| captureSelection | `() => void` | Save selection for openMention; same example |
| openMention | `(source: string) => void` | Open a configured category; unknown categories do nothing; same example |
| getValue | `() => InputValue` | Compatibility alias for getter |
| setValue | `(value: InputValue) => void` | Compatibility alias for setter |

```ts
const snapshot = editor.value?.getValue();
if (snapshot !== undefined) editor.value?.setValue(snapshot);
```

Capture selection on an external button's pointerdown, then call openMention on click. focus() moves to the end rather than restoring an earlier selection.

```vue
<button @pointerdown="editor?.captureSelection()" @click="editor?.openMention('member')">Choose member</button>
<button @pointerdown.prevent @click="editor?.insertText('More text')">Insert at selection</button>
```

## Slots

Only candidate-panel slots are provided. The [host example](../guide/input#host-sending-events-and-save-restore) implements them all.

| Name | Slot properties | Default |
| --- | --- | --- |
| label | `{ option, prefix, query, source }` | option.label and optional kind |
| loading | None | i18n.mentionLoading |
| empty | None | i18n.mentionEmpty |
| mention-header | `{ search }` | source and i18n.mentionHint |
| mention-footer | `{ search }` | No content |

Use search as MentionSearch; do not depend on undeclared internal offsets. Hosts translate custom slot content. There are no add/actions/footer toolbar slots. Put add/upload/send controls next to Input in the host layout.

## Related guides

- [Data and conversion](../guide/input)
- [Synchronous/asynchronous candidates and filtering](../guide/input-mentions)
- [Text, theme, popovers, and mobile sheets](../guide/input-configuration)
- [Public types and helpers](./types)
- [Render model output protocol](../guide/model-prompts)

Input does not create media or injected component containers. Its lightweight syntax is described in the [editing guide](../guide/input#editing-syntax-and-clipboard).
