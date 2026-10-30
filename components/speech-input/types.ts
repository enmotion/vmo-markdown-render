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
