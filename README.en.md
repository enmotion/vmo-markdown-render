# vmo-markdown-render

[简体中文](README.md) · English

[English Documentation](https://enmotion.github.io/vmo-markdown-render/en/) · [中文文档](https://enmotion.github.io/vmo-markdown-render/)

Vue 3 components for Markdown display and chat input, with ESM, CommonJS, and TypeScript declarations.

- **MarkdownRender**: full Markdown, accumulated streaming content, highlighting, formulas, Mermaid, media, registered Vue components, and text rules.
- **MarkdownInput**: a lightweight editor with categorized mentions, synchronous/asynchronous candidates, local/remote filtering, configurable popovers, mobile sheets, and text overrides. The host owns sending, toolbars, requests, and attachments.

## Install

```bash
npm install vmo-markdown-render
```

The host needs Vue `^3.3.4`. Import styles once in your application:

```ts
import 'vmo-markdown-render/style.css';
// Only needed when displaying formulas; includes KaTeX font references.
import 'vmo-markdown-render/math.css';
```

Use named component imports. There is no `app.use()` plugin.

## Render Markdown

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownRender } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
const content = ref('# Hello\n\nThis is **Markdown**.');
</script>
<template><MarkdownRender :content="content" theme="auto" :font-base-size="16" /></template>
```

For streaming, pass the accumulated document and set streaming=false when generation ends. Ordinary HTML is not executed; business tags require explicit registration. See the [Render API](docs/en/api/markdown-render.md).

## Chat input

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownInput, type InputValue, type MentionOption, type MentionSearch } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
const editor = ref<InstanceType<typeof MarkdownInput>>();
const value = ref<InputValue>([]);
const options = ref<MentionOption[]>([]);
const members: MentionOption[] = [
  { value: 'user-alice', label: 'Alice', source: 'member' },
  { value: 'user-bob', label: 'Bob', source: 'member' },
];
function search({ source }: MentionSearch) { options.value = source === 'member' ? members : []; }
function send() {
  const text = editor.value?.getText() ?? '';
  if (!text.trim()) return;
  console.log(text); // Call your own chat API here.
  editor.value?.setter([]);
}
</script>
<template>
  <MarkdownInput ref="editor" v-model="value"
    :mention-triggers="[{ character: '@', source: 'member' }]"
    :mention-shortcuts="[{ source: 'member', keys: { ctrl: true, key: 'u' } }]"
    :options="options" :i18n="{ placeholder: 'Ask anything…', mentionEmpty: 'No results' }" @search="search" />
  <button @pointerdown="editor?.captureSelection()" @click="editor?.openMention('member')">Choose member</button>
  <button @click="send">Send</button>
</template>
```

A character trigger requires an ASCII space immediately before the caret, such as `Hello @`. A lone @ at the start does not trigger. Shortcuts and host buttons provide alternative entry points. Search text stays in the candidate panel, outside document content and history.

Default v-model/getter/setter values are arrays:

```ts
[
  { label: 'Alice', id: 'user-alice', type: 'member' },
  { type: 'text', content: ' Please summarize.' },
]
```

getText() produces sendable text with explicit mention parameters:

```text
{"label":"Alice","id":"user-alice","type":"member"} Please summarize.
```

Default external arrays and send text omit data. Enter inserts a newline; Shift+Enter inserts an ordinary newline without continuing a list. The host can cancel the enter event to send instead. Input supports asterisk emphasis and hyphen/ordered lists; it does not render media, injected components, tables, code, quotes, or strikethrough.

## Candidate loading and filtering

| Mode | Data | filterOption | Example |
| --- | --- | --- | --- |
| Synchronous default | In-memory category list | Omit | [Local defaults](docs/en/guide/input-mentions.md#synchronous-candidates-and-default-local-filtering) |
| Synchronous custom | In-memory category list | Function | [Custom filtering](docs/en/guide/input-mentions.md#custom-local-filtering) |
| Async loading, local filtering | Fetch/cache a category's complete list | Omit or function | [Async local](docs/en/guide/input-mentions.md#asynchronous-loading-with-local-filtering) |
| Async remote search | Server filters by source/query | false | [Remote search](docs/en/guide/input-mentions.md#asynchronous-remote-filtering) |

The component does not send network requests. Remote mode disables text filtering but still isolates candidates by source. The examples include loading/error handling, caching or stale-response protection, and a real HTTP adapter contract.

## Model prompts and multimedia protocol

Provide the model with the renderer's output contract. The package includes **simple and detailed prompts in both English and Chinese**:

- [Prompt guide](docs/en/guide/model-prompts.md) / [中文说明](docs/guide/model-prompts.md)
- [Simple English](docs/public/prompts/render-simple.en-US.md) / [Detailed English](docs/public/prompts/render-detailed.en-US.md)
- [中文简版](docs/public/prompts/render-simple.zh-CN.md) / [中文详细版](docs/public/prompts/render-detailed.zh-CN.md)

The simple prompt lists Markdown capabilities and separately specifies image, audio, and video syntax. The detailed prompt also covers Mermaid, formulas, alerts/aliases, TOC, footnotes, and host-registered business tags. It does not assume demonstration tags are registered in your app. Both versions require real supplied media URLs.

## Documentation

- [Installation](docs/en/guide/getting-started.md)
- [Input data, sending, and persistence](docs/en/guide/input.md)
- [Candidate loading and filtering examples](docs/en/guide/input-mentions.md)
- [Event payloads, mention shortcuts and send keys](docs/en/guide/input-events.md)
- [Input appearance, i18n, and positioning](docs/en/guide/input-configuration.md)
- [Input props, events, methods, and slots](docs/en/api/markdown-input.md)
- [Render API](docs/en/api/markdown-render.md), [components](docs/en/guide/components.md), [text rules](docs/en/guide/text-rules.md)
- [Markdown and streaming](docs/en/guide/markdown.md), [themes](docs/en/guide/theme.md), [CSS variables](docs/en/markdown-styles.md)
- [Public types and helpers](docs/en/api/types.md)

The independent examples in docs/examples use package imports and are type-checked against the published declarations. Shared examples retain Chinese names to demonstrate initials matching; the configuration example includes English component text overrides.

## Source development

```bash
npm install
npm run build
npm run docs:check
npm run docs:dev
npm run docs:build
npm run docs:links
npm run test:run
npm run test:coverage
npm run test:coverage:input
npm run test:browser
npm pack --dry-run
```

The full coverage command enforces 100% per-file statements, branches, functions and lines across runtime code; the Input command checks Input separately. See [testing and compatibility](docs/en/guide/testing.md) for scope and browser verification. Browser tests support PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. VmoButton remains a compatibility export. Historical maintainer notes remain in Chinese; the consumer guides and APIs have both language versions.
