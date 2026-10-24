# Input appearance, text, and positioning

## Complete configuration example

This example covers theme, fontBaseSize, themeColors, disabled, readonly, unstyled, placeholder, i18n, placement, offset, mobilePlacement, serializeMention, and a transparent background. Its host controls are shared with the Chinese guide; the English KV checkbox demonstrates translated component text.

<script setup>
import InputConfiguration from '../../examples/InputConfiguration.vue';
</script>

<ClientOnly><InputConfiguration /></ClientOnly>

<<< ../../examples/InputConfiguration.vue

Copy the shared [candidate data file](./input-mentions#shared-data-and-trigger-configuration) alongside it.

## Theme, font size, and background

Input and Render share --md-* variables and the five semantic colors. An empty theme follows an ancestor .dark; light/dark set the instance mode; auto follows system preference. fontBaseSize defaults to 12px and falls back to 12 for non-positive or non-finite values.

```vue
<MarkdownInput theme="auto" :font-base-size="16"
  :theme-colors="{ primary: '#4f46e5', warning: '#b77916', info: '#0284c7', success: '#16804a', danger: '#dc2626' }"
  style="--md-background: transparent; --md-input-max-height: 16em" />
```

ThemeColors accepts lightBackground/darkBackground plus primary/warning/info/success/danger. Base colors must be opaque. Colors are 6/8-digit hex or comma-separated rgb/rgba; invalid values are ignored. Missing colors use theme fallback rules. Set --md-background for transparency; there is no separate transparent prop.

Input-specific variables are --md-input-padding, --md-input-radius, --md-input-max-height, --md-mention-color, --md-mention-background, and --md-mention-menu-background. See the [CSS reference](../markdown-styles).

Both disabled and readonly prevent user editing and candidate opening and hide tag deletion buttons. Disabled also adds a disabled appearance and tabindex=-1. Hosts can still update content with setter/v-model.

unstyled removes default visuals but retains editing, tags, menus, and positioning. Default styles no longer hide Markdown markers; the host supplies its own appearance. Imported CSS is not unloaded.

## i18n: external key/value overrides

There is no locale prop or built-in language selector. A complete Chinese KV is merged with props.i18n through computed. Undefined values do not override defaults; empty strings do. The explicit placeholder prop has higher priority than i18n.placeholder.

```ts
import { defaultInputI18n, type InputI18n } from 'vmo-markdown-render';
const text: Partial<InputI18n> = {
  placeholder: 'Ask anything…',
  mentionEmpty: 'No results',
  removeMention: 'Remove {label}',
};
console.log(defaultInputI18n.mentionLoading);
```

```vue
<MarkdownInput :i18n="text" />
```

| Key | Chinese default | Suggested English |
| --- | --- | --- |
| placeholder | 输入消息… | Ask anything… |
| mentionCandidates | 引用候选 | References |
| mentionSearchLabel | 搜索引用 | Search references |
| mentionSearchPlaceholder | 输入关键词搜索 | Search keywords |
| mentionClose | 关闭引用 | Close references |
| mentionHint | 输入关键词搜索 | Search keywords |
| mentionLoading | 正在搜索… | Searching… |
| mentionEmpty | 没有匹配的内容 | No results |
| removeMention | 删除 {label} | Remove {label} |
| getterError | 文本导出失败，已使用默认转换保留内容 | Export failed; default conversion used |
| setterError | 内容导入失败，字符串按普通文字保留，其他无效输入已清空 | Import failed; strings kept as text, other invalid input cleared |

removeMention uses literal {label} interpolation, never HTML. Dynamic updates preserve document/tag DOM, selection, history, query text, and IME composition, without another search. The host translates business labels/source/kind, slots, and external buttons.

## Desktop popovers and mobile sheets

```vue
<MarkdownInput placement="top" :offset="8" mobile-placement="bottom-sheet" />
```

| Setting | Behavior |
| --- | --- |
| placement=auto | Prefer below the caret |
| placement=top / bottom | Preferred side; flip when it is insufficient and the other side has more room |
| offset | Caret-to-popover distance in px; default 6, negative/non-finite values fall back to 6 |
| mobilePlacement=bottom-sheet | Slide up from the bottom at widths up to 600px; default |
| mobilePlacement=caret | Retain caret positioning on narrow screens, using placement/offset |

Caret popovers keep an 8px viewport margin. Width is at most 300px, the container width, and available viewport width. Height is limited when space is insufficient, with internal scrolling. Scroll, resize, and menu/container size changes update placement. If the original caret cannot be measured, the editor region is used.

Bottom sheets ignore placement/offset, keep a sticky search row, and adapt to safe areas and visualViewport keyboard changes. Maximum height is 65% of the visible viewport, falling back to 45dvh without that API. prefers-reduced-motion disables the slide animation. The breakpoint uses viewport width, not user-agent detection.

The menu renders in place and inherits Input's theme. There is no Teleport/append-to-body option. Avoid clipping overflow ancestors, especially in caret mode.
