# Themes and styles

## Light and dark mode

| theme | Behavior |
| --- | --- |
| Empty string | Follow an ancestor .dark; no explicit theme class/data-theme |
| light | Built-in content uses light colors |
| dark | Dark colors and .dark on this instance |
| auto | Follow system preference, applying .dark to this instance when appropriate |

The component does not change html/body. Instances can use different themes. Tailwind class-mode descendants may consume .dark, but explicit light cannot neutralize an existing ancestor's dark utility selectors.

## Instance colors

```vue
<MarkdownRender :content="content" theme="auto" :font-base-size="16"
  :theme-colors="{ primary: '#4f46e5', warning: '#b77916', info: 'rgb(37, 99, 235)', danger: 'rgba(220, 38, 38, 0.9)', success: '#16803cff' }" />
```

6/8-digit hex and comma-separated rgb/rgba are accepted. RGB channels must be 0–255 and alpha 0–1. Invalid values are ignored. Named colors, short hex, CSS variables, and hsl are not accepted through themeColors. Explicit colors survive theme changes; missing semantic colors fall back to primary.

## CSS and font size

```vue
<MarkdownRender class="article" :content="content" :font-base-size="16" />
```

```css
.article {
  --md-heading-color: #253047;
  --md-h1-color: #4338ca;
  --md-line-height: 1.8;
}
```

Heading colors fall back from level-specific to shared heading color to primary. themeColors sets inline variables, so change the prop when overriding the same color. See the [complete CSS reference](../markdown-styles).

Render applies the base size to .markdown-render__content, not the page root or outer shell. Headings and em-based spacing scale. Business components should use em or --md-size; fixed px values are not rewritten. Images fill content width with proportional height independently of font size. Mermaid fits its container at a 12px baseline, then scales the whole diagram with fontBaseSize. Enlarged diagrams can extend beyond the diagram viewport and be panned; the font cap still applies. The host controls outer dimensions/padding/margins/scrolling.

## Unstyled

```vue
<MarkdownRender class="custom-markdown" :content="content" unstyled />
```

unstyled removes md-styled, retaining semantic DOM, components, events, theme state, and rule processing. It does not unload CSS or remove separately imported math.css. Use a host class and :deep() selectors when working with Vue scoped styles.

Input shares the theme variables but has its own editing appearance, text overrides, and popover props; see [Input configuration](./input-configuration).

## Base colors and opaque steps

Both components accept independent `themeColors.lightBackground` (default `#ffffff`) and `darkBackground` (default `#151821`). Light mode uses light as background and dark as foreground; dark mode swaps them. Base colors must be opaque: six-digit hex, eight-digit hex ending in FF, rgb, or rgba with alpha 1. Invalid/translucent base colors are ignored. Semantic colors retain alpha support. Choose a contrasting light/dark pair; colors are not automatically corrected.

```vue
<MarkdownRender :content="content"
  :theme-colors="{ lightBackground: '#eeeeee', darkBackground: '#222222' }"
  style="--md-h1-font-size: 1.6em; --md-h2-font-size: 1.4em; --md-font-max-size: 24px" />
<MarkdownInput :theme-colors="{ lightBackground: '#f5f5f5', darkBackground: '#202020' }" />
```

Surface, border and muted text mix 7%, 20% and 65% foreground with the background, producing opaque steps. Alerts mix 4% semantic color with the background. Menus follow the background; controls/icons inherit their text color. Existing background/text/muted/border and specialized CSS overrides remain supported. Transparent buttons expose their parent surface; host CSS may still explicitly request transparency. Syntax highlighting, links, semantic colors and Mermaid retain their own theme palettes. Custom components must consume theme variables themselves. Default text now swaps the base colors; muted/border colors are derived rather than fixed.

## Content font size limits and headings

Render accepts `--md-h1-font-size` through `--md-h6-font-size`, defaulting to `2em`, `1.65em`, `1.35em`, `1.15em`, `1em`, `.9em`. `--md-font-max-size` caps the content base size in both Render and Input, and also caps each heading; it is unlimited by default. The smaller of the level size and shared cap applies. Use positive CSS lengths, including px/rem/em or clamp(); em follows fontBaseSize, while a px cap stays fixed. The base size is capped before relative sizes for code, tables and menus are calculated. Configure the variable on each instance or their common ancestor. In unstyled mode the host controls typography.

Use a positive px/rem cap for a consistent limit across descendants; avoid em for the shared cap. Migrate the removed `--md-heading-max-size` to `--md-font-max-size`. Formula base text is capped while internal mathematical proportions remain intact. Mermaid limits the scaled diagram text. Custom components with their own font sizes must consume the cap themselves; unstyled typography remains host-controlled.

Mermaid fontBaseSize scales the whole diagram rather than rewriting its internal 16px measurement font. The cap limits diagram width using that base; chart-specific title/annotation proportions remain intact. Formula math proportions also remain intact, so the shared cap is not an independent clamp on every special glyph inside third-party charts or formulas.
