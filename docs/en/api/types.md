# Public types and default helpers

Import all public types/helpers from the npm package entry. Do not depend on internal components or use.lib paths.

```ts
import { MarkdownInput, MarkdownRender, MarkdownImage, defaultInputCodec, defaultInputI18n } from 'vmo-markdown-render';
import type { InputValue, InputDocument, InputMentionNode, MentionOption, MentionSearch, InputI18n, MarkdownRenderProps, MarkdownImageProps, ImagePreviewOptions, ImageReference, ThemeColors } from 'vmo-markdown-render';
```

## Default conversion helpers

```ts
import { defaultInputCodec, defaultInputI18n, type InputDocument } from 'vmo-markdown-render';
const document: InputDocument = { version: 1, nodes: [
  { type: 'text', content: 'Ask ' },
  { type: 'mention', content: { label: 'Alice', id: 'user-alice', type: 'member' } },
] };
const value = defaultInputCodec.encode(document); // Default external array; no data.
const restored = defaultInputCodec.decode(value);
console.log(restored, defaultInputI18n.mentionEmpty);
```

encode/decode retain their helper names for compatibility but do not URI-encode the default protocol. A string passed to default decode becomes plain text, not inferred mentions. defaultInputI18n is the frozen Chinese KV; override it with the component i18n prop rather than mutating defaults.

Use `ref<InstanceType<typeof MarkdownInput>>()` for the component ref. Input exposes getter/setter/getText and editing helpers; Render exposes no custom instance methods.

## Input types

See the [Input API](./markdown-input) for events and methods.

```ts
import type { ThemeColors } from 'vmo-markdown-render';

export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};

export interface InputTextNode {
    type: 'text';
    content: string;
}

export interface InputMentionContent {
    label: string;
    id: string;
    type?: string;
    data?: Record<string, unknown>;
}

export interface InputMentionNode {
    type: 'mention';
    content: InputMentionContent;
}

export type InputValueNode = InputTextNode | Omit<InputMentionContent, 'data'>;

export type InputValue = InputValueNode[] | string;

export interface InputDocument {
    version: 1;
    nodes: (InputTextNode | InputMentionNode)[];
}

export interface MentionOption {
    value: string;
    label: string;
    source?: string;
    disabled?: boolean;
    kind?: string;
    data?: Record<string, JsonValue>;
}

export interface MentionSearch {
    prefix: string;
    query: string;
    source?: string;
    requestId: number;
}

export interface MentionTrigger {
    character: string;
    source: string;
}

export interface MentionShortcut {
    source: string;
    keys: {
        key: string;
        ctrl?: boolean;
        alt?: boolean;
        shift?: boolean;
        meta?: boolean;
    };
    prefix?: string;
}

export interface InputTextCodec {
    encode(document: InputDocument): InputValue;
    decode(value: InputValue): InputDocument;
}

export type InputGetter = (document: InputDocument) => InputValue;

export type InputSetter = (value: InputValue) => InputDocument;

export interface InputCodecError {
    stage: 'encode' | 'decode';
    message: string;
}

export interface InputEnterContext {
    inCode: boolean;
    inList: boolean;
}

export interface InputI18n {
    placeholder: string;
    mentionCandidates: string;
    mentionSearchLabel: string;
    mentionSearchPlaceholder: string;
    mentionClose: string;
    mentionHint: string;
    mentionLoading: string;
    mentionEmpty: string;
    removeMention: string;
    getterError: string;
    setterError: string;
}

export type MentionPlacement = 'auto' | 'top' | 'bottom';

export type MentionMobilePlacement = 'bottom-sheet' | 'caret';

export interface MarkdownInputProps {
    modelValue?: InputValue;
    getter?: InputGetter;
    setter?: InputSetter;
    prefix?: string | readonly string[];
    mentionTriggers?: readonly MentionTrigger[];
    mentionShortcuts?: readonly MentionShortcut[];
    options?: readonly MentionOption[];
    loading?: boolean;
    placement?: MentionPlacement;
    offset?: number;
    mobilePlacement?: MentionMobilePlacement;
    filterOption?: false | ((query: string, option: MentionOption, prefix: string) => boolean);
    i18n?: Partial<InputI18n>;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    theme?: '' | 'light' | 'dark' | 'auto';
    fontBaseSize?: number;
    themeColors?: ThemeColors;
    unstyled?: boolean;
    serializeMention?: (mention: InputMentionNode) => string;
}
```

## Render and theme types

```ts
import type { Component, VNode } from 'vue';

export interface TextMatch {
    match: string;
    captures: readonly (string | undefined)[];
    offset: number;
    input: string;
    groups?: Readonly<Record<string, string | undefined>>;
}

export type TextRule = {
    pattern: RegExp;
} & ({
    replace: string | ((context: TextMatch) => string | VNode);
    component?: never;
    props?: never;
} | {
    component: Component;
    props?: Record<string, unknown> | ((context: TextMatch) => Record<string, unknown>);
    replace?: never;
});

export interface MarkdownHeading {
    id: string;
    level: number;
    text: string;
}

export interface MarkdownError {
    stage: 'parse' | 'text-rule' | 'math' | 'mermaid' | 'highlight' | 'component' | 'clipboard' | 'resource';
    message: string;
    ruleIndex?: number;
}

export type ThemeColor = `#${string}` | `rgb(${number},${number},${number})` | `rgb(${number}, ${number}, ${number})` | `rgba(${number},${number},${number},${number})` | `rgba(${number}, ${number}, ${number}, ${number})`;

export interface ThemeColors {
  /** Opaque base: light background / dark foreground. */
  lightBackground?: ThemeColor;
  /** Opaque base: dark background / light foreground. */
  darkBackground?: ThemeColor;
    primary?: ThemeColor;
    warning?: ThemeColor;
    info?: ThemeColor;
    danger?: ThemeColor;
    success?: ThemeColor;
}

export interface ResourceUrlContext {
    type: 'image' | 'audio' | 'video';
    originalUrl: string;
}

export type ResourceUrlResolver = (url: string, context: ResourceUrlContext) => string;

export interface ImageReference {
  src: string;
  originalUrl: string;
  alt?: string;
  title?: string;
}

export interface MarkdownImageProps {
  src?: string;
  originalUrl?: string;
  alt?: string;
  title?: string;
  width?: string;
  reference?: boolean;
  preview?: boolean | ImagePreviewOptions;
  theme?: '' | 'light' | 'dark' | 'auto';
}

export interface ImagePreviewOptions {
  enabled?: boolean;
  background?: string | { light?: string; dark?: string };
  /** Default 2, clamped to 1–2 relative to the initial 50px-margin fit. */
  maxScale?: number;
  /** @deprecated Context menus removed; compatibility only, no effect. */
  longPressDownload?: boolean;
  /** Thumbnail action, independent of preview enabled. Default true. */
  reference?: boolean;
}

export interface MarkdownRenderProps {
    content?: string;
    baseUrl?: string;
    resolveUrl?: ResourceUrlResolver;
    imagePreview?: boolean | ImagePreviewOptions;
    streaming?: boolean;
    theme?: '' | 'light' | 'dark' | 'auto';
    themeColors?: ThemeColors;
    fontBaseSize?: number;
    components?: Record<string, Component>;
    textRules?: readonly TextRule[];
    alertLabels?: Readonly<Record<string, string>>;
    unstyled?: boolean;
}
```

## Speech input and waveform types

The package exports SpeechInput, SpeechWave and the following types. Instance refs use `InstanceType<typeof SpeechInput>`; slot fields are plain current values. See [speech input](../guide/speech-input) for defaults, events and recovery.

```ts
import { SpeechInput, SpeechWave } from 'vmo-markdown-render';
import type {
  SpeechInputMode, SpeechInputState, SpeechInputAvailability, SpeechInputLevelState,
  SpeechKeywordBoostState, SpeechInputProps, SpeechInputError, SpeechKeyword,
  SpeechKeywordMatch, SpeechInputHoldBindings, SpeechInputSlotProps, SpeechWaveProps,
} from 'vmo-markdown-render';
```

```ts
export type SpeechInputMode = 'local' | 'browser';
export type SpeechInputState = 'idle' | 'checking' | 'installing' | 'starting' | 'listening' | 'stopping' | 'error';
export type SpeechInputAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unsupported';
export type SpeechKeywordBoostState = 'off' | 'unavailable' | 'ready' | 'requested' | 'rejected';
export type SpeechInputLevelState = 'idle' | 'requesting' | 'active' | 'error';

export interface SpeechKeyword {
  phrase: string;
  /** Optional application identifier, returned with keyword matches. */
  id?: string;
  /** Recognition hint strength (0–10), only used when boostKeywords is enabled. */
  boost?: number;
}
export interface SpeechKeywordMatch { keyword: SpeechKeyword; transcript: string }
export interface SpeechInputError {
  code: string;
  message: string;
  /** Original browser exception, when one is provided. */
  cause?: { name: string; message: string };
}
export interface SpeechInputProps {
  /** Enables held Space in contenteditable elements inside the default slot. */
  enabled?: boolean;
  disabled?: boolean;
  lang?: string;
  /** local never falls back to a remote service. */
  mode?: SpeechInputMode;
  /** Request native punctuation when supported, then add missing segment terminators. */
  punctuation?: boolean;
  /** Opt in to experimental engine hints. Text keyword matching works independently. */
  boostKeywords?: boolean;
  keywords?: (string | SpeechKeyword)[];
  /** Capture a local audio-only stream to measure actual microphone volume. */
  meter?: boolean;
}

/** Bind to a native button with v-bind="hold" for pointer/keyboard push-to-talk. */
export interface SpeechInputHoldBindings {
  onPointerdown(event: PointerEvent): void;
  onPointercancel(event: PointerEvent): void;
  onLostpointercapture(event: PointerEvent): void;
  onKeydown(event: KeyboardEvent): void;
  onContextmenu(event: MouseEvent): void;
}

export interface SpeechInputSlotProps {
  state: SpeechInputState;
  /** True only after recognition starts; false during startup/finalization. */
  recording: boolean;
  /** Actual measured microphone level, normalized to 0–1. Requires meter. */
  level: number;
  levelState: SpeechInputLevelState;
  levelError: SpeechInputError | undefined;
  busy: boolean;
  canStart: boolean;
  disabled: boolean;
  enabled: boolean;
  transcript: string;
  availability: SpeechInputAvailability;
  keywordBoost: SpeechKeywordBoostState;
  error: SpeechInputError | undefined;
  start(): boolean;
  stop(): void;
  cancel(): void;
  install(): Promise<void>;
  refresh(): Promise<void>;
  setEnabled(enabled: boolean): void;
  hold: SpeechInputHoldBindings;
}

export interface SpeechWaveProps {
  active?: boolean;
  /** Measured audio level, 0–1. Defaults to silence (0), without synthetic pulses. */
  level?: number;
  /** Literal Canvas/CSS colors, e.g. #6366f1 or rgb(99, 102, 241). */
  colors?: string[];
  height?: number;
  /** Motion speed multiplier, 0–5. Zero renders a static shape. Default 1. */
  speed?: number;
  /** Visual amplitude gain, 0–3. Default 1.5; does not alter measured level. */
  intensity?: number;
}
```

## Local TTS types

LocalTts and LocalTtsError are runtime class exports; the remaining names below are types. `on<K extends keyof LocalTtsEvents>(event: K, listener: (data: LocalTtsEvents[K]) => void): () => void` preserves the event/payload mapping. See [LocalTts](../guide/local-tts) for methods and error delivery.

```ts
import { LocalTts, LocalTtsError } from 'vmo-markdown-render';
import type { LocalTtsOptions, LocalTtsState, LocalTtsChunk, LocalTtsSnapshot, LocalTtsEvents } from 'vmo-markdown-render';
```

```ts
export type LocalTtsState = 'idle' | 'buffering' | 'speaking' | 'paused' | 'ended' | 'stopped' | 'error' | 'disposed';

export interface LocalTtsOptions {
  /** Automatic voice selection uses an exact language match. Default: zh-CN. */
  lang?: string;
  /** Explicit local voice selection overrides automatic language selection. */
  voiceURI?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  /** Maximum Unicode code points in a segment. Default: 80. */
  maxChunkLength?: number;
  /** Maximum buffer wait in milliseconds; 0 disables timed flushing. Default: 1000. */
  flushDelay?: number;
  /** Wait for asynchronously loaded local voices. Default: 3000 ms. */
  voiceTimeout?: number;
}

export interface LocalTtsChunk {
  index: number;
  text: string;
  voiceURI: string;
  voiceName: string;
}

export interface LocalTtsSnapshot {
  state: LocalTtsState;
  bufferedText: string;
  currentText: string;
  queuedChunks: number;
}

export class LocalTtsError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = 'LocalTtsError'; }
}

export interface LocalTtsEvents {
  change: LocalTtsSnapshot;
  statechange: LocalTtsState;
  voiceschange: SpeechSynthesisVoice[];
  chunkstart: LocalTtsChunk;
  chunkend: LocalTtsChunk;
  end: undefined;
  error: LocalTtsError;
}
```

## Compatibility exports

VmoButton and ButtonParams remain available for older consumers. MarkdownInput does not depend on that button; hosts choose their own send controls.
