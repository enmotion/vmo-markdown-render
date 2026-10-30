import { splitSpeechBuffer } from './chunks';
import { LocalTtsError, type LocalTtsChunk, type LocalTtsEvents, type LocalTtsOptions, type LocalTtsSnapshot, type LocalTtsState } from './types';

// The browser exposes one synthesis channel per window. Only an owning instance
// may pause, resume or cancel it; idle instances must not interrupt another one.
const owners = new WeakMap<SpeechSynthesis, LocalTts>();
const languageKey = (lang: string) => lang.replace(/_/g, '-').toLowerCase();
type Completion = { promise: Promise<void>; resolve(): void; reject(error: LocalTtsError): void };
type VoiceWaiter = { resolve(voice: SpeechSynthesisVoice): void; reject(error: LocalTtsError): void; timer: ReturnType<typeof setTimeout> };

export class LocalTts {
  private readonly options: Required<Omit<LocalTtsOptions, 'voiceURI'>> & { voiceURI?: string };
  private readonly synth?: SpeechSynthesis;
  private readonly Utterance?: typeof SpeechSynthesisUtterance;
  private readonly listeners = new Map<keyof LocalTtsEvents, Set<(data: never) => void>>();
  private voices: SpeechSynthesisVoice[] = [];
  private readonly voiceWaiters = new Set<VoiceWaiter>();
  private buffer = '';
  private queue: string[] = [];
  private active?: { utterance: SpeechSynthesisUtterance; chunk: LocalTtsChunk };
  private timer?: ReturnType<typeof setTimeout>;
  private completion?: Completion;
  private phase: LocalTtsState = 'idle';
  private closed = false;
  private paused = false;
  private voicePending = false;
  private generation = 0;
  private chunkIndex = 0;
  private source = '';
  private inputMode?: 'append' | 'update';
  private lastError?: LocalTtsError;
  private readonly voiceChanged = () => { this.refreshVoices(); };

  constructor(options: LocalTtsOptions = {}) {
    this.options = { lang: options.lang ?? 'zh-CN', voiceURI: options.voiceURI, rate: options.rate ?? 1, pitch: options.pitch ?? 1, volume: options.volume ?? 1, maxChunkLength: options.maxChunkLength ?? 80, flushDelay: options.flushDelay ?? 1000, voiceTimeout: options.voiceTimeout ?? 3000 };
    const ranges: [number, number, number, string][] = [
      [this.options.rate, .1, 10, 'rate'], [this.options.pitch, 0, 2, 'pitch'], [this.options.volume, 0, 1, 'volume'],
      [this.options.maxChunkLength, 2, 1000, 'maxChunkLength'], [this.options.flushDelay, 0, 60000, 'flushDelay'], [this.options.voiceTimeout, 0, 60000, 'voiceTimeout'],
    ];
    for (const [value, min, max, name] of ranges) if (!Number.isFinite(value) || value < min || value > max) throw new LocalTtsError('invalid-option', `${name} 必须在 ${min}–${max} 之间。`);
    this.options.maxChunkLength = Math.floor(this.options.maxChunkLength);
    if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
      this.synth = window.speechSynthesis; this.Utterance = window.SpeechSynthesisUtterance;
      this.synth.addEventListener('voiceschanged', this.voiceChanged);
      this.refreshVoices();
    }
  }
  get supported() { return !!this.synth && !!this.Utterance; }
  get state(): LocalTtsState { return this.phase; }
  get snapshot(): LocalTtsSnapshot { return { state: this.phase, bufferedText: this.buffer, currentText: this.active?.chunk.text ?? '', queuedChunks: this.queue.length }; }
  on<K extends keyof LocalTtsEvents>(event: K, listener: (data: LocalTtsEvents[K]) => void): () => void {
    this.assertAlive();
    let listeners = this.listeners.get(event);
    if (!listeners) { listeners = new Set(); this.listeners.set(event, listeners); }
    const callback = listener as (data: never) => void;
    listeners.add(callback);
    return () => { listeners.delete(callback); };
  }
  private emit<K extends keyof LocalTtsEvents>(event: K, data: LocalTtsEvents[K]) {
    for (const listener of [...this.listeners.get(event) ?? []]) listener(data as never);
  }
  private publish() { this.emit('change', this.snapshot); }
  private setState(state: LocalTtsState) { if (this.phase !== state) { this.phase = state; this.emit('statechange', state); } this.publish(); }
  private assertAlive() { if (this.phase === 'disposed') throw new LocalTtsError('disposed', '此朗读实例已销毁。'); }
  private assertOpen() {
    this.assertAlive();
    if (this.closed) throw new LocalTtsError('stream-closed', '本轮文本流已结束，请先 reset() 再开始新消息。');
  }
  /** Only local voices are returned. Remote voices are never selected. */
  getVoices(): SpeechSynthesisVoice[] { return [...this.voices]; }
  refreshVoices(): SpeechSynthesisVoice[] {
    this.assertAlive();
    this.voices = this.synth?.getVoices().filter(voice => voice.localService === true) ?? [];
    const voice = this.selectVoice();
    if (voice) for (const waiter of this.voiceWaiters) { clearTimeout(waiter.timer); waiter.resolve(voice); this.voiceWaiters.delete(waiter); }
    this.emit('voiceschange', this.getVoices());
    return this.getVoices();
  }
  private selectVoice() {
    return this.options.voiceURI ? this.voices.find(voice => voice.voiceURI === this.options.voiceURI)
      : this.voices.find(voice => languageKey(voice.lang) === languageKey(this.options.lang));
  }
  ready(): Promise<SpeechSynthesisVoice> {
    this.assertAlive();
    if (!this.supported) return Promise.reject(new LocalTtsError('unsupported', '当前环境不支持浏览器语音合成。'));
    this.refreshVoices();
    const voice = this.selectVoice();
    if (voice) return Promise.resolve(voice);
    return new Promise((resolve, reject) => {
      const waiter: VoiceWaiter = { resolve, reject, timer: setTimeout(() => {
        this.voiceWaiters.delete(waiter);
        reject(new LocalTtsError('voice-unavailable', '没有可用的指定本地声音，请在系统中安装语音包或选择其他本地声音。'));
      }, this.options.voiceTimeout) };
      this.voiceWaiters.add(waiter);
    });
  }
  append(delta: string): void {
    this.assertOpen();
    if (this.inputMode === 'update') throw new LocalTtsError('input-mode', '本轮使用 update() 接收累计全文，不能混用 append()。');
    this.inputMode = 'append'; this.accept(delta);
  }
  update(fullText: string): void {
    this.assertOpen();
    if (this.inputMode === 'append') throw new LocalTtsError('input-mode', '本轮使用 append() 接收增量，不能混用 update()。');
    if (!fullText.startsWith(this.source)) throw new LocalTtsError('non-append-update', '累计全文只能追加；修改已接收内容前请 reset()。');
    this.inputMode = 'update';
    const delta = fullText.slice(this.source.length); this.source = fullText; this.accept(delta);
  }
  private accept(delta: string) {
    if (!delta) return;
    this.buffer += delta;
    this.extract(false);
    if (this.buffer && !this.timer && this.options.flushDelay > 0) this.timer = setTimeout(() => { this.timer = undefined; this.extract(true); this.pump(); }, this.options.flushDelay);
    this.pump();
  }
  private extract(flush: boolean) {
    const result = splitSpeechBuffer(this.buffer, this.options.maxChunkLength, flush);
    this.buffer = result.rest; this.queue.push(...result.chunks);
    if (!this.buffer) { clearTimeout(this.timer); this.timer = undefined; }
  }
  finish(): Promise<void> {
    this.assertAlive();
    if (this.phase === 'ended') return Promise.resolve();
    if (this.lastError) return Promise.reject(this.lastError);
    if (this.phase === 'stopped') return Promise.reject(new LocalTtsError('canceled', '朗读已停止。'));
    if (!this.completion) {
      let resolve!: () => void, reject!: (error: LocalTtsError) => void;
      const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
      this.completion = { promise, resolve, reject };
    }
    const promise = this.completion.promise;
    this.closed = true; this.extract(true); this.pump();
    return promise;
  }
  private pump() {
    if (this.phase === 'disposed' || this.phase === 'stopped' || this.phase === 'error') return;
    if (this.paused) { this.setState('paused'); return; }
    if (this.active || this.voicePending) { this.publish(); return; }
    if (!this.queue.length) {
      if (this.closed && !this.buffer) {
        const token = this.generation;
        const completion = this.completion; this.completion = undefined;
        this.release(); completion?.resolve(); this.setState('ended');
        if (this.generation === token) this.emit('end', undefined);
      } else this.setState(this.buffer || this.inputMode ? 'buffering' : 'idle');
      return;
    }
    const voice = this.selectVoice();
    if (!voice) {
      const token = this.generation; this.voicePending = true; this.setState('buffering');
      if (token !== this.generation) return;
      void this.ready().then(() => { if (token === this.generation) { this.voicePending = false; this.pump(); } }, error => { if (token === this.generation) this.fail(error); });
      return;
    }
    const synth = this.synth!, Utterance = this.Utterance!;
    const owner = owners.get(synth);
    if (owner && owner !== this || !owner && (synth.speaking || synth.pending || synth.paused)) { this.fail(new LocalTtsError('busy', '浏览器朗读通道正在被其他实例使用。')); return; }
    owners.set(synth, this);
    const text = this.queue.shift()!;
    const utterance = new Utterance(text);
    utterance.voice = voice; utterance.lang = voice.lang;
    utterance.rate = this.options.rate; utterance.pitch = this.options.pitch; utterance.volume = this.options.volume;
    const chunk: LocalTtsChunk = { text, index: this.chunkIndex++, voiceURI: voice.voiceURI, voiceName: voice.name };
    const active = { utterance, chunk }; this.active = active;
    utterance.onstart = () => { if (this.active === active) { this.setState(this.paused ? 'paused' : 'speaking'); if (this.active === active) this.emit('chunkstart', chunk); } };
    utterance.onend = () => {
      if (this.active !== active) return;
      this.detach(); this.active = undefined; this.emit('chunkend', chunk); this.pump();
    };
    utterance.onerror = event => { if (this.active === active) this.fail(new LocalTtsError(event.error, `本地朗读失败（${event.error}）。`)); };
    this.setState('buffering');
    if (this.active !== active) return;
    try { synth.speak(utterance); } catch { this.fail(new LocalTtsError('synthesis-failed', '无法启动本地语音合成。')); }
  }
  pause(): void {
    this.assertAlive();
    if (this.closed && !this.active && !this.queue.length && !this.buffer || this.phase === 'error' || this.phase === 'stopped') return;
    this.paused = true;
    if (this.active && this.synth && owners.get(this.synth) === this) this.synth.pause();
    this.setState('paused');
  }
  resume(): void {
    this.assertAlive();
    if (!this.paused) return;
    this.paused = false;
    if (this.active && this.synth && owners.get(this.synth) === this) { this.synth.resume(); this.setState('speaking'); }
    else this.pump();
  }
  private detach() { if (this.active) this.active.utterance.onstart = this.active.utterance.onend = this.active.utterance.onerror = null; }
  private release() { if (this.synth && owners.get(this.synth) === this) owners.delete(this.synth); }
  private clear(error: LocalTtsError) {
    this.generation++; clearTimeout(this.timer); this.timer = undefined;
    this.detach(); this.active = undefined; this.queue = []; this.buffer = ''; this.voicePending = false;
    if (this.synth && owners.get(this.synth) === this) {
      try { this.synth.cancel(); if (this.synth.paused) this.synth.resume(); } finally { this.release(); }
    }
    for (const waiter of this.voiceWaiters) { clearTimeout(waiter.timer); waiter.reject(error); } this.voiceWaiters.clear();
    this.completion?.reject(error); this.completion = undefined;
    this.paused = false;
  }
  private fail(error: LocalTtsError) { this.lastError = error; this.closed = true; this.clear(error); this.setState('error'); this.emit('error', error); }
  stop(): void {
    this.assertAlive(); this.closed = true; this.clear(new LocalTtsError('canceled', '朗读已停止。')); this.setState('stopped');
  }
  reset(): void {
    this.assertAlive(); this.clear(new LocalTtsError('canceled', '已开始新一轮朗读。'));
    this.closed = false; this.lastError = undefined; this.source = ''; this.inputMode = undefined; this.chunkIndex = 0; this.setState('idle');
  }
  dispose(): void {
    if (this.phase === 'disposed') return;
    this.closed = true; this.clear(new LocalTtsError('canceled', '朗读实例已销毁。'));
    this.synth?.removeEventListener('voiceschanged', this.voiceChanged); this.setState('disposed'); this.listeners.clear();
  }
}
