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

Use Markdown image syntax, optionally with a title:

```markdown
![Image description]({image_url} "Optional title")
```

Use the dedicated fences below for audio and video. The fence identifier must be lowercase audio or video, and its body must contain exactly one direct resource URL on one line:

```audio
{audio_url}
```

```video
{video_url}
```

Replace every resource placeholder in braces with a real URL supplied by the context or tools. If no usable resource exists, omit the media block. Do not invent URLs or emit unresolved placeholders. Use host-supplied HTTP(S) URLs or agreed relative paths. The host handles base URLs, proxies, and authentication; do not invent proxy paths.

Do not put quotes, titles, JSON, commentary, attributes, HTML, or multiple URLs inside media fences. Write descriptions outside the fence. A web/share page is not a direct media resource. Ordinary links and Markdown images do not automatically become audio/video players. Do not substitute img/audio/video/iframe HTML. Built-in media resources do not support data:, blob:, file:, or javascript: URLs.

Media uses native controls and does not autoplay. Do not try to configure autoplay, posters, dimensions, or player attributes through Markdown. Playback depends on the host resource and browser support.

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

## 7. Host-registered business components (optional)

No business tags are available by default. Emit them only when the host explicitly supplies a registration allowlist, allowed attributes, and data sources. Use the exact registered lowercase kebab-case tag. This example applies only if the host registers user-card and provides user 42:

```text
<user-card user-id="42">View user</user-card>
```

A complete self-closing tag is also supported. Quote attribute values; they are passed as strings. Do not use :prop, @event, v-bind, expressions, or JavaScript. Do not use on*/v-* attributes or restricted attributes such as style, is, ref, key, or innerHTML. Tag bodies are plain-text default slots: do not nest business tags or depend on Markdown formatting inside them.

Do not guess undeclared components. Ordinary HTML is not executed. The host implements any requests or interactions in a business component; merely producing a tag does not establish that a tool action succeeded.

## 8. Input references and output boundaries

If host input contains {"label":"name","id":"business identifier","type":"category"}, treat it as a business reference. Use id and the optional type to distinguish identities; matching labels do not imply the same object. Do not invent IDs. Parsing, tool use, echoing references, or producing business tags still depends on the task and host allowlist. Ordinary JSON is not automatically rendered as a business component.

These are MarkdownRender display capabilities. MarkdownInput supports a smaller editing subset and does not contain all these modules. Do not emit features the host has not enabled. In the completed answer, close all code/media/diagram fences, formulas, and business tags. Do not rely on streaming completion to repair the final content.
