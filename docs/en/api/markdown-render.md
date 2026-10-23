# MarkdownRender API

## Complete configuration and events

This example covers every Render prop and event. It supplies accumulated streaming content and configures themes, text rules, components, alerts, and resource conversion per instance. /api/media is an application endpoint example, used only for matching resource URLs.

<script setup>
import RenderComplete from '../../examples/RenderComplete.vue';
</script>

<ClientOnly><RenderComplete /></ClientOnly>

<<< ../../examples/RenderComplete.vue

For focused examples, see [components](../guide/components), [text rules](../guide/text-rules), and [Markdown/streaming](../guide/markdown). Chat input has a separate [Input API](./markdown-input).

## Props

Use kebab-case in templates and camelCase in TypeScript.

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| content | `string` | `''` | Current accumulated Markdown, not an individual network chunk |
| baseUrl | `string` | undefined | Absolute resource base; end directory URLs with / |
| resolveUrl | `ResourceUrlResolver` | undefined | Synchronous image/audio/video URL conversion, not ordinary links |
| streaming | `boolean` | false | Temporary syntax completion; set false when done to parse original text |
| theme | `'' \| 'light' \| 'dark' \| 'auto'` | `''` | Ancestor .dark, explicit theme, or system preference |
| themeColors | `ThemeColors` | undefined | Instance semantic colors |
| fontBaseSize | `number` | 12 | px; non-positive/non-finite values fall back to 12 |
| components | `Record<string, Component>` | `{}` | Instance-specific lowercase kebab-case component map |
| textRules | `readonly TextRule[]` | `[]` | Body text replacement with text/VNodes/components |
| alertLabels | `Readonly<Record<string, string>>` | undefined | Uppercase alert marker translations; inline titles win |
| unstyled | `boolean` | false | Remove default md-styled typography/theme, retain structure and behavior |

Default arrays/maps are created per instance. See [public types](./types).

## Emits

The complete example registers all three events.

| Event | Argument | When |
| --- | --- | --- |
| error | `MarkdownError` | Parsing, text rules, enhancements, components, clipboard, or resources fail |
| headings-change | `MarkdownHeading[]` | Initial parsing and subsequent parsed heading updates; may be empty |
| link-click | `{ href: string; event: MouseEvent }` | A link click bubbles to the root, including TOC/component links |

headings-change may fire even if heading text is unchanged. href is the original link attribute, not necessarily absolute. Navigation is not prevented automatically. Built-in non-anchor links use target=_blank and rel=noopener noreferrer.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownRender, type MarkdownHeading, type MarkdownError } from 'vmo-markdown-render';
const headings = ref<MarkdownHeading[]>([]);
function error(value: MarkdownError) { console.warn(value.stage, value.message, value.ruleIndex); }
function link({ href, event }: { href: string; event: MouseEvent }) {
  if (href.startsWith('/app/')) { event.preventDefault(); /* Call your router here. */ }
}
</script>
<template><MarkdownRender content="# Example" @error="error" @headings-change="headings = $event" @link-click="link" /></template>
```

## Instance methods

Render exposes no custom instance methods or properties. There is no render(), refresh(), or getHeadings(). Update props and listen to headings-change instead. Use a host wrapper ref for measurement or scrolling:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownRender } from 'vmo-markdown-render';
const container = ref<HTMLDivElement>();
function top() { container.value?.scrollTo({ top: 0, behavior: 'smooth' }); }
</script>
<template>
  <button @click="top">Back to top</button>
  <div ref="container" style="max-height:400px;overflow:auto"><MarkdownRender content="# Example" /></div>
</template>
```

## Slots and attributes

Render itself has no public slots or v-model. class/style fall through to its single root. Registered business components receive plain-text default slot content; see [injection](../guide/components).

## Model instructions

Use the [English/Chinese simple and detailed prompts](../guide/model-prompts) to tell models the exact output format, including the separate multimedia protocol. Only append business tags actually registered by your host.
