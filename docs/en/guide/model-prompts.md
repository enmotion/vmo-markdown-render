# Model output protocol and prompts

Models need to know the formats supported by the renderer. This page provides simple and detailed prompts in English and Chinese, with a separate, explicit multimedia protocol. They match the current Render implementation and do not enable demonstration business components by default.

[简体中文版本](../../guide/model-prompts)

## Choose a version

| Version | Markdown | Multimedia | Special formats |
| --- | --- | --- | --- |
| Simple | Lists supported Markdown features | Explicit standard/advanced images and explicit audio/video directives with legacy fence support, with examples | Component format constraints included; other features supplied by the host |
| Detailed | Basic syntax plus table and task-list examples | The same protocol plus URL/player boundaries | Mermaid, formulas, alerts/aliases, TOC, footnotes, business components, and input references |

The two languages express the same protocol. Pick one; you do not need to include both. Use the simple version for ordinary Markdown conversations. Use the detailed version when the model should use more display features. If you use the simple prompt but need Mermaid or another extension, add its format contract or select the detailed prompt.

Both versions require a direct Markdown body, not an answer wrapped in one code fence. They are model instructions, not a MarkdownRender prop. They do not send requests, call tools, or register components.

## Multimedia reference

| Media | Recommended format | Compatibility |
| --- | --- | --- |
| Image | `![Description](URL)` or `::image[Description]{src="URL" width="60%"}` | Standard images remain supported |
| Audio | `::audio[Description]{src="URL" type="audio/mpeg"}` | Single-URL audio fence |
| Video | `::video[Description]{src="URL" type="video/mp4" width="80%"}` | Single-URL video fence |

Image/video width is percentage-only, default 100%, with proportional height. Audio stays full-width. MIME type is optional; directives identify the media category independently of suffixes. Each directive occupies one line. Do not use HTML/event attributes. Custom components retain registered tags. See [Media protocol](./markdown#explicit-media-directives-recommended).

## Custom component format constraints

Both prompt versions now include a dedicated component contract. Components retain registered tags, **not the ::component media-directive form**. The host supplies registration, allowed attributes and business data; prompts do not register components.

| Item | Format or constraint |
| --- | --- |
| Paired tag | `<user-card user-id="42">View user</user-card>` |
| Self-closing tag | `<user-card user-id="42" />` |
| Name | Exact registered lowercase kebab-case |
| Attributes | Quoted strings; only host-declared fields and real data |
| Slot | Plain-text default slot only; no nesting or Markdown parsing inside |
| Actual output | Directly in the body; blank lines around standalone cards; fences only to display source |
| Disallowed | Vue expressions/directives/events, on*, v-*, style, is, ref, key, innerHTML |
| Unavailable | No allowlist, registration or required data: use ordinary text, not guessed tags/IDs |

The user-card name above is illustrative. Append a real host declaration to the prompt after registering the matching component:

```text
Only these business components are allowed:
- user-card: user card; required string user-id must be an ID already supplied in context.
- Optional plain-text default slot: a readable action label, such as “View user”.
- Forms: <user-card user-id="REAL_ID">View user</user-card> or <user-card user-id="REAL_ID" />.
- REAL_ID is a placeholder: replace it with supplied data, never emit it literally or invent an ID.
- Output actual tags directly, outside fences. Do not emit incomplete/nested tags or ::component.
- Without a valid ID, use ordinary text. A displayed card does not establish that an operation ran.
```

The renderer filters generic unsafe attributes but does not automatically enforce each business component's required fields, enums or types. Validate these in host components and describe them in the prompt. See [component attributes and slots](./components#attribute-and-slot-boundaries).

## Load and integrate

The npm package includes four standalone Markdown files under `docs/public/prompts/`:

| File | Purpose |
| --- | --- |
| render-simple.en-US.md | Simple English |
| render-detailed.en-US.md | Detailed English |
| render-simple.zh-CN.md | Simple Chinese |
| render-detailed.zh-CN.md | Detailed Chinese |

A Node.js server can load them by package path. This example builds messages without invoking a provider SDK; change the language argument to en-US when using English:

<<< ../../examples/read-render-prompt.ts

Pass the protocol through the appropriate system/developer instruction channel in your model adapter. Add your application rules, supplied resources, and actual component allowlist. User content or retrieved documents must not silently become a trusted component registration list.

Vite applications can also import a prompt as raw text before sending it to their own server. The `?raw` suffix is Vite-specific, not a generic Node.js import:

```ts
import protocol from 'vmo-markdown-render/docs/public/prompts/render-simple.en-US.md?raw';
```

<script setup>
import { withBase } from 'vitepress';
</script>

## Simple English prompt

<a :href="withBase('/prompts/render-simple.en-US.md')" download>Download the simple English Markdown prompt</a>

<<< ../../public/prompts/render-simple.en-US.md

## Detailed English prompt

<a :href="withBase('/prompts/render-detailed.en-US.md')" download>Download the detailed English Markdown prompt</a>

<<< ../../public/prompts/render-detailed.en-US.md

## Chinese prompts

Read the full text on the [Chinese protocol page](../../guide/model-prompts), or download:

- <a :href="withBase('/prompts/render-simple.zh-CN.md')" download>Simple Chinese prompt</a>
- <a :href="withBase('/prompts/render-detailed.zh-CN.md')" download>Detailed Chinese prompt</a>

## Host capabilities and business components

The detailed prompt describes the library's output protocol. Remove features your application has not enabled or does not want the model to use. Math requires math.css; Mermaid and other enhancements load asynchronously on demand. Prompts do not create media files or proxy services.

There is no default business-tag allowlist. The following is an application-specific example. Register the matching component in your host before adding an actual manifest to model instructions:

```text
This application additionally allows:
- user-card: a registered user card accepting only a string user-id.
- user-id must come from the user IDs supplied in this context.
- Example, only when user 42 was supplied: <user-card user-id="42">View user</user-card>
Do not emit business tags outside this allowlist.
```

This is not a universally available component registry. Attributes do not execute Vue expressions; tag bodies are plain-text slots. See [component injection](./components). Host textRules are additional matching contracts, not built-in model capabilities. Plain JSON does not automatically become a component.

## Input versus Render

These prompts target **MarkdownRender output display**. MarkdownInput supports a smaller editing subset and does not include media containers or injected components. The `{"label","id","type"}` objects in sent input text are business reference parameters, not automatic component/tool calls. The host decides how to interpret them.

Valid syntax does not establish factual accuracy, resource availability, or successful tool execution. Keep the application's existing parsing, resource-error, and business-validation handling; prompts do not replace it.
