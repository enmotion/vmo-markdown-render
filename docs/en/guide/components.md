# Registered Vue components

Use components for explicit business tags in Markdown, or textRules for business identifiers in body text. Both render actual Vue components with normal reactivity and dependency injection.

## Register a tag

```vue
<script setup lang="ts">
import { MarkdownRender } from 'vmo-markdown-render';
import UserCard from './UserCard.vue';
const components = { 'user-card': UserCard };
const content = '<user-card user-id="42">View user</user-card>';
</script>
<template><MarkdownRender :content="content" :components="components" /></template>
```

UserCard.vue:

```vue
<script setup lang="ts">
defineProps<{ userId: string }>();
</script>
<template><span>User {{ userId }} · <slot /></span></template>
```

A complete self-closing tag is supported too. Only registered names render as components; unknown tags remain readable text. Use exact lowercase kebab-case names. There are no default business tags.

## Attribute and slot boundaries

- Quote attribute values; they are strings. user-id can map to userId.
- Numbers, booleans, and objects are not automatically converted. Parse them in the component or use textRules to pass actual JS values.
- :prop, @event, v-bind, and expressions do not execute as Vue templates.
- Attribute names beginning with on or v-, plus style/is/ref/key/innerhtml, are rejected.
- Tag bodies are plain-text default slots, not nested business tags, Markdown, or named slots.

A single standalone tag can render outside a paragraph. Inline components should use inline roots such as span/button.

## Provide/inject and interaction

The host can provide services and callbacks. Render does not create global services or fixed injection keys.

Host:

```vue
<script setup lang="ts">
import { provide } from 'vue';
import { MarkdownRender } from 'vmo-markdown-render';
import UserCard from './UserCard.vue';
provide('open-user', (id: string) => console.log('Open user', id));
const components = { 'user-card': UserCard };
</script>
<template><MarkdownRender content='<user-card user-id="42" />' :components="components" /></template>
```

UserCard.vue:

```vue
<script setup lang="ts">
import { inject } from 'vue';
defineProps<{ userId: string }>();
const openUser = inject<(id: string) => void>('open-user');
</script>
<template><button @click="openUser?.(userId)">Open user {{ userId }}</button></template>
```

Shared InjectionKey Symbols are suitable for larger projects. Tags cannot declare event handlers. Use injected callbacks or textRules props/h() to connect business events.

## Lifecycle and streaming

A complete self-closing or paired tag must arrive before mounting. Incomplete tags remain text. Normal tail appends preserve existing instances, but earlier edits, structure changes, or registry changes can remount them.

Put requests in component lifecycle/watch handlers, with cancellation/retry/error handling owned by the component. Do not start requests during render or a text-rule callback. Keep registries stable; use markRaw/shallowRef if storing component definitions in reactive containers.

## Tell the model what is registered

Use the [detailed model prompt](./model-prompts), then append your actual tag/attribute/data allowlist. A documentation example such as user-card is not available until your host registers it. Model-generated tags are display requests, not proof that a business operation succeeded.

For paired/self-closing forms, copyable model constraints and the host allowlist template, see [component format constraints in prompts](./model-prompts#custom-component-format-constraints). Both simple and detailed prompts include this contract.
