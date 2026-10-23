import './styles/markdown/index.css';
import VmoButton from "@comps/vmo-button/vmo-button.vue";
import type { ButtonParams } from "@comps/vmo-button/types";
export {
  VmoButton,
  ButtonParams
}
export { default as MarkdownRender } from './components/markdown-render/markdown-render.vue';
export type { ResourceUrlContext, ResourceUrlResolver, ThemeColor, ThemeColors, MarkdownRenderProps, MarkdownHeading, MarkdownError, TextRule, TextMatch } from './components/markdown-render/types';

import './styles/input/index.css';
export { default as MarkdownInput } from './components/markdown-input/markdown-input.vue';
export type { MentionPlacement, MentionMobilePlacement, InputI18n, InputValue, InputValueNode, InputMentionContent, InputEnterContext, InputGetter, InputSetter, InputTextCodec, InputCodecError, InputDocument, InputTextNode, InputMentionNode, MentionOption, MentionSearch, MentionTrigger, MentionShortcut, MarkdownInputProps, JsonValue } from './components/markdown-input/types';

export { defaultInputCodec } from './components/markdown-input/codec';

export { defaultInputI18n } from './components/markdown-input/i18n';
