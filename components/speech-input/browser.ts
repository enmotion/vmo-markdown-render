// Keep experimental browser types private instead of modifying global DOM types.
export interface BrowserSpeechResult {
  isFinal: boolean;
  readonly [index: number]: { transcript: string };
}
export interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  unspokenPunctuation?: boolean;
  processLocally?: boolean;
  phrases?: unknown[];
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<BrowserSpeechResult> }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export interface BrowserSpeechConstructor {
  new(): BrowserSpeechRecognition;
  available?(options: { langs: string[]; processLocally: boolean }): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
  install?(options: { langs: string[]; processLocally: true }): Promise<boolean>;
}
export function localSpeechPolicyAllowed(): boolean | undefined {
  const policy = document as unknown as {
    permissionsPolicy?: { allowsFeature(name: string): boolean };
    featurePolicy?: { allowsFeature(name: string): boolean };
  };
  return (policy.permissionsPolicy ?? policy.featurePolicy)?.allowsFeature('on-device-speech-recognition');
}
export function speechBrowser() {
  return window as unknown as {
    SpeechRecognition?: BrowserSpeechConstructor;
    webkitSpeechRecognition?: BrowserSpeechConstructor;
    SpeechRecognitionPhrase?: new(phrase: string, boost: number) => unknown;
  };
}
