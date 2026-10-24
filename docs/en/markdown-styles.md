# CSS variables

Load style.css and, for formulas, math.css. Configure variables on an instance class or host ancestor.

| Variable | Purpose/default |
| --- | --- |
| --md-primary | Primary color: light #4f46e5, dark #a5a0ff |
| --md-warning / info / success / danger | Optional semantic colors, falling back to primary |
| --md-light-background / --md-dark-background | Base colors, default #ffffff / #151821; swap background and foreground by theme |
| --md-h1-font-size through --md-h6-font-size | Heading sizes; defaults 2 / 1.65 / 1.35 / 1.15 / 1 / .9em |
| --md-font-max-size | Content font size cap shared by Render and Input; unlimited by default |
| --md-heading-color | Shared heading color, falling back to primary |
| --md-h1-color through --md-h6-color | Level-specific heading colors |
| --md-text-color | Theme body text |
| --md-muted-color | Theme secondary text |
| --md-background | Theme container background |
| --md-border-color | Theme border |
| --md-link-color | Link color, default primary |
| --md-code-background | Code background |
| --md-table-header-background | Table header background |
| --md-font | Body font, system sans-serif by default |
| --md-mono-font | System monospace by default |
| --md-block-spacing | Block spacing, 1em |
| --md-line-height | Body line height, 1.75 |
| --md-default-surface | Body color at 7% opaque mix with the background; shared by neutral subcontainers |
| --md-video-background | Video background, default common opaque surface |
| --md-audio-background | Audio background, body color at 7% opaque mix with the background |
| --md-radius | Panel radius, .5em |
| --md-alert-background | Semantic color mixed at 4% |
| --md-alert-border | Semantic alert border |
| --md-code-keyword / string / number / comment | Highlight colors |
| --md-font-base-size | fontBaseSize in px, default 12px |
| --md-size | Base size capped by --md-font-max-size; available to business components |

Semantic container classes include .md-code-block, .md-toc, .md-alert, .md-mermaid, and .md-table-scroll. Paragraph/block spacing defaults to 1em; headings use em. With unstyled, the host supplies typography. Formula CSS remains an explicit import.

Render sets font size on the inner content, leaving the outer shell to the host. A fixed outer height needs host overflow styling. Theme follows ancestor .dark by default; explicit dark/auto affects only the current root. Existing ancestor Tailwind dark selectors cannot be cancelled by removing this instance's class.

Neutral surfaces mix with the renderer background. Alerts retain semantic colors. Registered components can consume --md-default-surface to match the surrounding content.

## Input variables

Input shares the theme/font/semantic variables and adds:

| Variable | Default | Purpose |
| --- | --- | --- |
| --md-input-padding | 1em | Editor padding |
| --md-input-radius | .75em | Container radius |
| --md-input-max-height | 20em | Main editor max height before scrolling |
| --md-mention-color | Current primary | Mention text |
| --md-mention-background | Default surface | Mention background |
| --md-mention-menu-background | Default background | Candidate menu background |

```vue
<MarkdownInput style="--md-background: transparent; --md-input-padding: .75em; --md-input-max-height: 12em" />
```

Use placement/offset/mobilePlacement for menu positioning instead of changing internal geometry variables. See [Input configuration](./guide/input-configuration).
