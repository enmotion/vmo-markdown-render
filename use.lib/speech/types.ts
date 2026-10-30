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
