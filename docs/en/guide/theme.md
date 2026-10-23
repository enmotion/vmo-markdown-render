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

Render applies the base size to .markdown-render__content, not the page root or outer shell. Headings and em-based spacing scale. Business components should use em or --md-size; fixed px values are not rewritten. Images fill content width with proportional height independently of font size. Mermaid scales through em and is bounded by its container. The host controls outer dimensions/padding/margins/scrolling.

## Unstyled

```vue
<MarkdownRender class="custom-markdown" :content="content" unstyled />
```

unstyled removes md-styled, retaining semantic DOM, components, events, theme state, and rule processing. It does not unload CSS or remove separately imported math.css. Use a host class and :deep() selectors when working with Vue scoped styles.

Input shares the theme variables but has its own editing appearance, text overrides, and popover props; see [Input configuration](./input-configuration).
