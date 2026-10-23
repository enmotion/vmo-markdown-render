# Model output protocol and prompts

Models need to know the formats supported by the renderer. This page provides simple and detailed prompts in English and Chinese, with a separate, explicit multimedia protocol. They match the current Render implementation and do not enable demonstration business components by default.

[简体中文版本](../../guide/model-prompts)

## Choose a version

| Version | Markdown | Multimedia | Special formats |
| --- | --- | --- | --- |
| Simple | Lists supported Markdown features | Explicit image syntax and single-URL audio/video fences, with examples | Supplied separately by the host |
| Detailed | Basic syntax plus table and task-list examples | The same protocol plus URL/player boundaries | Mermaid, formulas, alerts/aliases, TOC, footnotes, business components, and input references |

The two languages express the same protocol. Pick one; you do not need to include both. Use the simple version for ordinary Markdown conversations. Use the detailed version when the model should use more display features. If you use the simple prompt but need Mermaid or another extension, add its format contract or select the detailed prompt.

Both versions require a direct Markdown body, not an answer wrapped in one code fence. They are model instructions, not a MarkdownRender prop. They do not send requests, call tools, or register components.

## Multimedia reference

| Content | Required format | Formats that do not automatically become media |
| --- | --- | --- |
| Image | `![Description](URL)`, optionally with a title | Arbitrary img HTML |
| Audio | Lowercase audio fence containing one direct URL on one line | Ordinary links, audio HTML, JSON configuration, multiple URLs |
| Video | Lowercase video fence containing one direct URL on one line | Ordinary links, web/share pages, iframe, video HTML |

````markdown
![Cover]({image_url})

```audio
{audio_url}
```

```video
{video_url}
```
````

Braces are syntax placeholders, not usable resources. Replace them with real URLs already supplied by the context. Omit media when resources are missing; do not invent URLs. HTTP(S) and agreed relative paths are supported. The host handles baseUrl, resolveUrl, proxies, permissions, codecs, and playback support. See [Markdown and media](./markdown).

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
