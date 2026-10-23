# Installation and quick start

## Install the npm package

```bash
npm install vmo-markdown-render
```

Your host needs Vue `^3.3.4`. The package provides ESM, CommonJS, and TypeScript declarations. Use named imports; there is no app.use() plugin.

Load styles once in your application:

```ts
import 'vmo-markdown-render/style.css';
// Only needed for formulas, including KaTeX font references.
import 'vmo-markdown-render/math.css';
```

## Render Markdown

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownRender } from 'vmo-markdown-render';
const content = ref('# Hello\n\nThis is **Markdown**.');
</script>
<template><MarkdownRender :content="content" theme="auto" :font-base-size="16" /></template>
```

See the [complete Render example](../api/markdown-render#complete-configuration-and-events), [Markdown and streaming](./markdown), and [business components](./components).

## Add chat input

This complete host example covers synchronous candidates, send policies, node persistence, every Input event, candidate slots, and the main instance methods. Shared sample names remain Chinese to demonstrate initials filtering. The buttons and source comments are shared with the Chinese examples; all component text is configurable through i18n.

<script setup>
import InputChat from '../../examples/InputChat.vue';
</script>

<ClientOnly><InputChat /></ClientOnly>

::: details Complete Vue file
<<< ../../examples/InputChat.vue
:::

Copy InputChat.vue together with input-data.ts from the [shared candidate data](./input-mentions#shared-data-and-trigger-configuration). The host owns requests, send buttons, toolbars, and attachments.

## Choose a guide

| Need | Guide |
| --- | --- |
| Default arrays, parameter JSON send text, persistence | [Input data and sending](./input) |
| Synchronous candidates, async loading, local/remote filtering | [Mention candidates](./input-mentions) |
| Themes, text, disabled/readonly, mobile popovers | [Input configuration](./input-configuration) |
| Every prop, event, method, and slot | [Input API](../api/markdown-input) |
| Model-ready simple/detailed prompts and media formats | [Output protocol](./model-prompts) |
| Types and default conversion helpers | [Public types](../api/types) |

## Test a local package

In the source repository:

```bash
npm install
npm run build
npm pack
```

Install the resulting file in a consumer project, adjusting its path/version:

```bash
npm install /path/to/vmo-markdown-render-0.0.1.tgz
```

## Build the docs

From the source repository, run npm run build first, followed by npm run docs:check and npm run docs:dev or npm run docs:build. Examples resolve the package's dist entry rather than internal source paths. The static site is written to docs/.vitepress/dist. For a subpath deployment, set DOCS_BASE, for example `DOCS_BASE=/vmo-markdown-render/ npm run docs:build`.
