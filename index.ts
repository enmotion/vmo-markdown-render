import './styles/markdown/index.css';
import VmoButton from "@comps/vmo-button/vmo-button.vue";
import type { ButtonParams } from "@comps/vmo-button/types";
export {
  VmoButton,
  ButtonParams
}
export { default as MarkdownRender } from './components/markdown-render/markdown-render.vue';
export type { ImagePreviewOptions, ResourceUrlContext, ResourceUrlResolver, ThemeColor, ThemeColors, MarkdownRenderProps, MarkdownHeading, MarkdownError, TextRule, TextMatch } from './components/markdown-render/types';

import './styles/input/index.css';
export { default as MarkdownInput } from './components/markdown-input/markdown-input.vue';
export type { MentionPlacement, MentionMobilePlacement, InputI18n, InputValue, InputValueNode, InputMentionContent, InputEnterContext, InputGetter, InputSetter, InputTextCodec, InputCodecError, InputDocument, InputTextNode, InputMentionNode, MentionOption, MentionSearch, MentionTrigger, MentionShortcut, MarkdownInputProps, JsonValue } from './components/markdown-input/types';

export { defaultInputCodec } from './components/markdown-input/codec';

export { defaultInputI18n } from './components/markdown-input/i18n';

export { default as SpeechInput } from './components/speech-input/speech-input.vue';
export type { SpeechInputMode, SpeechInputState, SpeechInputAvailability, SpeechInputProps, SpeechInputError, SpeechKeyword, SpeechKeywordMatch, SpeechKeywordBoostState, SpeechInputSlotProps, SpeechInputHoldBindings, SpeechInputLevelState } from './components/speech-input/types';
export { default as SpeechWave } from './components/speech-wave/speech-wave.vue';
export type { SpeechWaveProps } from './components/speech-wave/types';

export { LocalTts } from './use.lib/speech/local-tts';
export { LocalTtsError } from './use.lib/speech/types';
export type { LocalTtsOptions, LocalTtsState, LocalTtsChunk, LocalTtsSnapshot, LocalTtsEvents } from './use.lib/speech/types';
