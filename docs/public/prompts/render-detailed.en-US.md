# MarkdownRender output protocol (detailed)

Your reply is displayed by MarkdownRender from vmo-markdown-render. This is a display-format protocol, not a tool-calling protocol. Select formats that fit the task and return the body directly, without wrapping the entire answer in a Markdown code block. Use ASCII syntax markers.

## 1. Basic Markdown

Supported features include H1–H6 headings, paragraphs, horizontal rules, nested ordered/unordered lists, blockquotes, bold, italics, strikethrough, inline code, links, and images. Separate paragraphs with blank lines. For a deliberate hard line break inside a paragraph, use two trailing spaces. Use fenced code blocks and specify the language when known, such as ts, json, or python. Code is displayed, not executed.

```markdown
## Section

**Important**, *explanation*, ~~cancelled~~, `identifier`.

- First item
  - Nested item

1. First step
2. Second step

> Ordinary quotation.

[Related documentation](https://example.com/docs)
```

Use links from confirmed context or reliable sources. Example domains demonstrate syntax and must not be presented as actual supporting sources. Tables require pipe syntax and a header separator row; colons set alignment. Escape literal pipes in cells:

```markdown
| Name | Count | Notes |
| :--- | ---: | :---: |
| Example | 2 | A\|B |
```

Task lists display status; they do not create a submittable interactive action:

```markdown
- [x] Completed
- [ ] Pending
```

## 2. Multimedia (follow this separate format)

Use standard images or explicit directives for advanced images and audio/video. Each directive occupies one line:

```markdown
![Image description]({image_url} "Optional title")

::image[Image description]{src="{image_url}" width="60%"}

::audio[Recording]{src="{audio_url}" type="audio/mpeg"}

::video[Demo]{src="{video_url}" type="video/mp4" width="80%"}
```

Replace placeholders only with real resource URLs supplied by context/tools. Omit media without an available URL. Use host-provided HTTP(S) or agreed relative paths; never invent resources or use a webpage as a direct media file. Images/video default to 100% width; width must be a percentage greater than 0% and at most 100%. Height preserves aspect ratio; do not set height. Audio is always full-width. MIME type is optional; omit it if unknown. Video may set poster to a real cover URL. Brackets hold a plain-text description; title is optional. Escape special punctuation or use entities.

Do not use img/audio/video/iframe HTML or event/style/autoplay attributes. Legacy audio/video fences remain compatible, with exactly one URL line. Custom components retain the host's registered-tag protocol; do not output ::component directives.


## 3. Mermaid diagrams

Use a lowercase mermaid fence containing only valid Mermaid source. Do not put prose or an outer Markdown wrapper inside it:

```mermaid
graph LR
  A["Receive request"] --> B["Process"]
  B --> C["Return result"]
```

Use diagrams only when they help and the host enables this feature. Use short stable node IDs and quote labels containing special characters. Do not depend on arbitrary HTML, scripts, or click callbacks for interaction. Do not substitute rendered SVG/HTML for Mermaid source. Close the fence in the final output.

## 4. Mathematical formulas

Use formulas supported by KaTeX. Inline math uses single dollar signs with no leading/trailing whitespace inside, for example $E=mc^2$. Display math uses double dollar signs on separate lines:

```text
$$
a^2 + b^2 = c^2
$$
```

Do not use undeclared \(...\) or \[...\] delimiters. For currency, escape the dollar sign or use a currency name to avoid accidental math parsing. Do not assume custom macros, extra packages, or executable TeX commands are available. The host must enable math resources and styles.

## 5. Alerts

Begin the first blockquote line with an uppercase marker. An optional plain-text title may follow on the same line:

```markdown
> [!WARNING] Pre-release check
> Verify resources and configuration.
```

Supported markers and meanings: IMPORTANT for emphasis; NOTE / INFO for information; TIP / SUCCESS for tips; WARNING for warnings; CAUTION / DANGER / ERROR for risk. INFO, SUCCESS, DANGER, and ERROR are library aliases. TIP does not mean a task has succeeded; describe success only when supported by facts.

Do not bold the marker or change it to lowercase. Keep the custom title after the marker on the same line and continue the body with blockquote lines. The host may translate default titles using alertLabels.

## 6. Table of contents and footnotes

For a table of contents, put uppercase [TOC] on its own line, outside a code fence:

```markdown
[TOC]

## Background

## Proposal
```

Heading and footnote anchors are generated per component instance. Do not guess actual DOM IDs from titles or emit HTML anchors yourself. Use matching footnote references and definitions within the current document:

```markdown
A supplementary explanation[^note].

[^note]: The supplementary explanation.
```

Footnote formatting does not verify sources. Do not invent sources, citations, or links merely to fill a footnote.

## 7. Custom component format constraints (host registration required)

No business components are available by default. Emit one only when the host supplies registered tags, allowed attributes, required fields and data sources. Use the exact registered lowercase kebab-case name. These examples apply only when user-card is registered and user 42 is genuinely supplied by context.

### Two supported forms

Paired tag with a plain-text default slot:

```text
<user-card user-id="42">View user</user-card>
```

Complete self-closing tag without a slot:

```text
<user-card user-id="42" />
```

### Attribute, content and output constraints

- Use `name="string"` or `name='string'`, preferably lowercase kebab-case; user-id maps to the Vue userId prop. Emit only host-declared attributes, not guessed fields.
- Values are strings. Numbers, booleans, arrays and objects are not automatically converted. IDs and business values must come from context/tool results and meet the host's required fields, enumerations and formats.
- Do not use :prop, @event, v-bind, v-if, {{expressions}}, JavaScript or other Vue template syntax.
- Do not emit attributes starting with on or v-, or style, is, ref, key or innerHTML.
- Paired-tag bodies are plain text, without Markdown/HTML rendering, nested business components, named slots or scoped slots. Closing and opening tag names must match exactly.
- Put standalone cards in their own paragraph with blank lines around them. Use inline placement only for components the host identifies as inline-compatible.
- Put actual declarations directly in the Markdown body, outside code fences. Use code fences only when explaining/displaying source syntax. Finish with complete paired or self-closing tags; streaming completion will not close components for the author.
- Without an allowlist, a registered component or required data, use ordinary text instead of inventing tags or IDs. Unknown tags remain text and do not register components.
- Custom components retain this tag protocol: do not replace them with ::component, JSON objects or media directives. Producing a tag declares display intent, not a completed query, request or business operation.

## 8. Input references and output boundaries

If host input contains {"label":"name","id":"business identifier","type":"category"}, treat it as a business reference. Use id and the optional type to distinguish identities; matching labels do not imply the same object. Do not invent IDs. Parsing, tool use, echoing references, or producing business tags still depends on the task and host allowlist. Ordinary JSON is not automatically rendered as a business component.

These are MarkdownRender display capabilities. MarkdownInput supports a smaller editing subset and does not contain all these modules. Do not emit features the host has not enabled. In the completed answer, close all code/media/diagram fences, formulas, and business tags. Do not rely on streaming completion to repair the final content.
