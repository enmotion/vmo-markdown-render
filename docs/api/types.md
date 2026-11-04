# 公共类型与默认工具

全部从 npm 包入口具名导入，不需要访问 components 或 use.lib 内部路径。

```ts
import { MarkdownInput, MarkdownRender, MarkdownImage, defaultInputCodec, defaultInputI18n } from 'vmo-markdown-render';
import type { InputValue, InputDocument, InputMentionNode, MentionOption, MentionSearch, InputI18n, MarkdownRenderProps, MarkdownImageProps, ImagePreviewOptions, ImageReference, ThemeColors } from 'vmo-markdown-render';
```

## 默认转换工具

```ts
import { defaultInputCodec, defaultInputI18n, type InputDocument } from 'vmo-markdown-render';
const document: InputDocument = { version: 1, nodes: [
  { type: 'text', content: '请参考 ' },
  { type: 'mention', content: { label: '林见微', id: 'user-lin', type: 'member' } },
] };
const value = defaultInputCodec.encode(document); // 默认外部数组；不含 data。
const restored = defaultInputCodec.decode(value); // 恢复内部 document。
console.log(restored, defaultInputI18n.mentionEmpty);
```

encode/decode 名称是兼容工具接口，默认不做 URI 编码。字符串传给默认 decode 会成为普通文字，不从参数 JSON 自动推断 mention。defaultInputI18n 是冻结的完整中文文案对象；给组件传 i18n 进行部分覆盖，不修改默认对象。

组件 ref 使用 `ref<InstanceType<typeof MarkdownInput>>()`。Input 提供显式 getter/setter/getText 等方法；Render 没有公开自定义实例方法。

## Input 类型

以下与当前公开声明对应；事件签名和实例方法见 [Input API](./markdown-input)。

```ts
import type { ThemeColors } from 'vmo-markdown-render';
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface InputTextNode { type: 'text'; content: string }

export interface InputMentionContent {
  label: string;
  id: string;
  type?: string;
  data?: Record<string, unknown>;
}

export interface InputMentionNode { type: 'mention'; content: InputMentionContent }

/** 默认对外数组：文字保留 content，mention 仅输出身份与名称。 */
export type InputValueNode = InputTextNode | Omit<InputMentionContent, 'data'>;

export type InputValue = InputValueNode[] | string;

/** 草稿持久化协议；换行保存在 content 中，不解析或执行 Markdown。 */
export interface InputDocument { version: 1; nodes: (InputTextNode | InputMentionNode)[] }

export interface MentionOption {
  value: string; label: string; source?: string; disabled?: boolean; kind?: string;
  data?: Record<string, JsonValue>;
}

export interface MentionSearch {
  prefix: string; query: string;
  /** 当前入口绑定的分类；仅兼容的 prefix 未分类入口可为空。 */
  source?: string;
  /** 每次查询递增；远程请求应只应用最近一次请求结果。 */
  requestId: number;
}

/** 至少指定 ctrl/alt/shift/meta 中一个修饰键；字符键必须为单个可打印字符。 */
export interface MentionTrigger {
  /** 单个可打印提示字符；仅在半角空格后直接键入时触发。 */
  character: string;
  source: string;
}

export interface MentionShortcut {
  source: string;
  keys: { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean };
  /** 搜索上下文的提示前缀，默认 @；不改变标签 label，也不作为字符触发条件。 */
  prefix?: string;
}

/** 高级定制入口；默认输出节点数组，自定义转换可返回字符串。 */
export interface InputTextCodec {
  encode(document: InputDocument): InputValue;
  decode(value: InputValue): InputDocument;
}

export type InputGetter = (document: InputDocument) => InputValue;

export type InputSetter = (value: InputValue) => InputDocument;

export interface InputCodecError { stage: 'encode' | 'decode'; message: string }

export interface InputEnterContext { inCode: boolean; inList: boolean }

/** 平铺文案表；removeMention 支持 {label} 插值。 */
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
  /** 对外节点数组，默认空数组；自定义 getter/setter 可使用字符串。 */
  modelValue?: InputValue;
  /** getter：内部节点转换为对外数组或自定义文本，供 v-model 和实例 getter() 使用。 */
  getter?: InputGetter;
  /** setter：外部数组或文本转换为内部节点，供 v-model 与实例 setter(text) 使用。 */
  setter?: InputSetter;
  /** 兼容的未分类单字符入口，默认关闭；新代码使用 mentionTriggers。 */
  prefix?: string | readonly string[];
  /** 多个提示字符与分类映射，仅半角空格后直接输入字符时唤起。 */
  mentionTriggers?: readonly MentionTrigger[];
  mentionShortcuts?: readonly MentionShortcut[];
  options?: readonly MentionOption[];
  loading?: boolean;
  /** 桌面优先方向；空间不足时翻转，默认 auto（优先下方）。 */
  placement?: MentionPlacement;
  /** 浮窗与光标的距离（px），默认 6。 */
  offset?: number;
  /** 600px 及以下默认底部向上展开；caret 则跟随光标。 */
  mobilePlacement?: MentionMobilePlacement;
  /** false 用于远程过滤；默认按 label / value 本地过滤。 */
  filterOption?: false | ((query: string, option: MentionOption, prefix: string) => boolean);
  /** 部分覆盖中文默认文案；undefined 不覆盖，空字符串允许覆盖。 */
  i18n?: Partial<InputI18n>;
  /** 优先于 i18n.placeholder。 */
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  theme?: '' | 'light' | 'dark' | 'auto';
  fontBaseSize?: number;
  themeColors?: ThemeColors;
  unstyled?: boolean;
  /** 自定义发送/复制文字中的 mention 表达，默认 JSON.stringify({label,id,type})；不改变草稿与标签。 */
  serializeMention?: (mention: InputMentionNode) => string;
}
```

## Render 与主题类型

```ts
import type { Component, VNode } from 'vue';

/** 文本替换回调的稳定上下文，不暴露底层解析器类型。 */
export interface TextMatch {
  /** 原文中完整命中的文本。 */
  match: string;
  /** 捕获组，未参与匹配的分组为 undefined。 */
  captures: readonly (string | undefined)[];
  /** 当前正文文本节点内的偏移。 */
  offset: number;
  input: string;
  groups?: Readonly<Record<string, string | undefined>>;
}

/** 多规则独立匹配原文；同位置按数组顺序取首个，输出不再匹配。 */
export type TextRule = { pattern: RegExp } & (
  | {
    /** 字符串按纯文本展示；回调也可返回 Vue VNode。输出不会再次匹配。 */
    replace: string | ((context: TextMatch) => string | VNode);
    component?: never;
    props?: never;
  }
  | {
    /** 每次命中渲染一个真实 Vue 组件。 */
    component: Component;
    props?: Record<string, unknown> | ((context: TextMatch) => Record<string, unknown>);
    replace?: never;
  }
);

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

/** 支持 #RRGGBB / #RRGGBBAA 与逗号分隔的 rgb / rgba；具体格式和范围在运行时校验。 */
export type ThemeColor = `#${string}` | `rgb(${number},${number},${number})` | `rgb(${number}, ${number}, ${number})` | `rgba(${number},${number},${number},${number})` | `rgba(${number}, ${number}, ${number}, ${number})`;

export interface ThemeColors {
  /** 不透明基础色：亮色背景／暗色前景。 */
  lightBackground?: ThemeColor;
  /** 不透明基础色：暗色背景／亮色前景。 */
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

/** markdown-render 公共属性；不接受可执行的 Vue 模板。 */
export interface MarkdownRenderProps {
  /** 当前累计完整 Markdown，默认空字符串。 */
  content?: string;
  /** 资源基础地址，需为绝对 URL；目录地址请以 / 结尾。 */
  baseUrl?: string;
  /** 同步转换内置图片、音频和视频的地址，不处理普通链接。 */
  resolveUrl?: ResourceUrlResolver;
  /** 默认启用图片预览；false 关闭，或传入配置。 */
  imagePreview?: boolean | ImagePreviewOptions;
  /** 是否仍在生成；结束时设为 false，按原文重新解析。 */
  streaming?: boolean;
  /** 默认空字符串不指定主题，跟随宿主 .dark；auto 跟随系统。显式暗色在本容器添加 .dark。 */
  theme?: '' | 'light' | 'dark' | 'auto';
  /** 实例语义色；非法值忽略，未配置时沿用默认回退规则。 */
  themeColors?: ThemeColors;
  /** 基础字号，单位 px，默认 12；非正数或非有限值回退到 12。 */
  fontBaseSize?: number;
  /** 小写 kebab-case 标签到业务组件的实例级映射。 */
  components?: Record<string, Component>;
  /** 只处理正文文本，不处理代码、公式、URL 或组件属性。 */
  textRules?: readonly TextRule[];
  /** 提示标题的实例级翻译；键为大写类型，如 IMPORTANT、NOTE；Markdown 自定义标题优先。 */
  alertLabels?: Readonly<Record<string, string>>;
  /** 移除默认排版主题，保留语义结构。 */
  unstyled?: boolean;
}
```

## 语音输入与波纹类型

SpeechInput、SpeechWave 以及以下类型均从包入口导出。组件 ref 使用 `InstanceType<typeof SpeechInput>`；插槽字段为当前普通值。默认值、事件和错误恢复见 [语音输入](../guide/speech-input)。

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

## 本地 TTS 类型

LocalTts、LocalTtsError 是运行时类导出，其余为类型。事件订阅签名为 `on<K extends keyof LocalTtsEvents>(event: K, listener: (data: LocalTtsEvents[K]) => void): () => void`，事件名决定载荷类型。方法与错误通道见 [本地 TTS](../guide/local-tts)。

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

## 兼容导出

包入口继续保留 VmoButton 与 ButtonParams，用于旧项目兼容。MarkdownInput 不依赖这个按钮组件，发送按钮由宿主自行选择实现。
