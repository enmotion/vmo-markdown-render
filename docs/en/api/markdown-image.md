# MarkdownImage API

## Standalone usage

Import `MarkdownImage` from the package entry point to use the same preview, zoom, pan, touch gestures and error feedback without MarkdownRender.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownImage, MarkdownRender, type ImageReference } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
const selected = ref<ImageReference>();
const content = '![Beach](/images/photo.png "Sunset")';
</script>

<template>
  <MarkdownImage src="/images/photo.png" alt="Beach" width="320px" @reference="selected = $event" />
  <MarkdownRender :content="content" @image-reference="selected = $event" />
  <output v-if="selected">Reference: {{ selected.src }}</output>
</template>
```

| MarkdownImage prop | Type | Default and meaning |
| --- | --- | --- |
| src | string | Display URL; missing URLs cannot open the preview |
| originalUrl | string | Optional business URL before conversion; falls back to src in reference events |
| alt / title | string | Image description/title |
| width | string | Image container CSS width, e.g. 320px or 60%; defaults to 100%, preserving aspect ratio |
| reference | boolean | true; show the thumbnail action, independent of preview=false |
| preview | `boolean \| ImagePreviewOptions` | true; false or `{ enabled: false }` disables opening |
| theme | `'' \| 'light' \| 'dark' \| 'auto'` | Ancestor .dark by default, or explicit/system theme |

Native class/style and load/error listeners are forwarded to the thumbnail img. Standalone images use src directly; compute business URL conversion externally and pass originalUrl if needed. Inside Render, MarkdownImage shares Render's theme, preview options and one overlay; its own `preview=false` or `preview={ enabled: false }` can still prevent opening.

Hover over the thumbnail to reveal a double-quote icon, inset 5px from its left and bottom edges. Its tooltip and accessible name are 引用图片 (reference image). Keyboard focus also reveals it; touch devices keep it visible. Activate this thumbnail button directly. The image emits `reference`, and the containing Render forwards `image-reference`, each exactly once per activation, with `{ src, originalUrl, alt?, title? }`. Render supplies the resolved display URL as src and the parsed pre-conversion resource URL as originalUrl. Referencing does not open the preview or modify input/clipboard. Vue component events do not automatically bubble through arbitrary ancestors: application panels must forward the event in their own emits.

Hide the action with `:preview="{ reference: false }"` or Render's `:image-preview="{ reference: false }"`. Standalone images also accept :reference="false". Disabling preview does not disable reference. Linked images retain navigation and hide the reference button. Standalone images and Render instances still share the single-active-preview lifecycle.

## Payload and application-panel forwarding

```ts
interface ImageReference {
  src: string;
  originalUrl: string;
  alt?: string;
  title?: string;
}
```

src is the displayed URL; originalUrl is the pre-conversion URL, defaulting to src for a standalone image. The chain is `MarkdownImage @reference` → `MarkdownRender @image-reference` when contained in Render → the application panel's own `emit('image-reference', image)` → its external listener. A standalone image does not emit image-reference itself. Referencing does not open preview or insert anything into an editor.

These two typechecked Vue files implement a business panel and its external host.

<script setup>
import ImageReferenceDemo from '../../examples/ImageReferenceDemo.vue';
</script>

<ClientOnly><ImageReferenceDemo /></ClientOnly>

Panel:

<<< ../../examples/ImageReferencePanel.vue

External host:

<<< ../../examples/ImageReferenceDemo.vue

## Preview rules and migration

- Initial/minimum fit preserves 50px on every viewport edge. Larger images shrink proportionally; smaller images retain natural size. This initial size is 100%.
- Default maximum is 200%: twice the initial width and height, four times the area. Zoom cannot go below the initial fit.
- The margin applies only to fitting; enlarged images use the whole viewport for display and panning. Resize recalculates the fit.
- A two-part capsule contains the read-only percentage and an X close button. Wheel, pinch and +/−/0 control zoom; X/backdrop/Escape closes preview.
- maxScale now defaults to 2 and is clamped to 1–2; legacy values such as 8 are also capped at 2.
- Context, touch-hold, download and open-original menus have been removed. longPressDownload remains a deprecated no-op. There is no automatic download; native mobile menus need target-device checks.

See the [preview guide](../guide/markdown#full-screen-image-preview) and [ImagePreviewOptions](./markdown-render#image-preview-options). Component width accepts CSS values; Markdown image directives still accept percentages only and do not interpret Vue props.

## Load failures and native events

Standalone @load and @error receive native image Event objects, not MarkdownError. A failed resource does not remove the image; browser-specific broken-image/alt display may remain, with no shared thumbnail error placeholder. Preview load failures show local feedback.

MarkdownRender @error reports parsing, enhancement and URL-conversion errors; image HTTP/decode failures are not forwarded automatically. Standalone images do not run Render baseUrl/resolveUrl. Supply a displayable src and optional originalUrl yourself. See [resource URLs](../guide/markdown#resource-urls-and-proxies).

## DOM, slots and instance surface

A positioning span wraps the image. width controls that container; native class/style and image listeners target the internal img. Do not assume the component $el is an img. The component supplies action positioning/interaction CSS. There are no public slots, v-model or custom instance methods.
