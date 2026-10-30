// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LocalTts } from '../../use.lib/speech/local-tts';
import { LocalTtsError, type LocalTtsOptions } from '../../use.lib/speech/types';

const zh = { voiceURI: 'local-zh', name: '本地中文', lang: 'zh-CN', localService: true, default: true } as SpeechSynthesisVoice;
const en = { voiceURI: 'local-en', name: 'Local English', lang: 'en-US', localService: true, default: false } as SpeechSynthesisVoice;
const remote = { voiceURI: 'remote-zh', name: '远端中文', lang: 'zh-CN', localService: false, default: false } as SpeechSynthesisVoice;
class Utterance {
  voice?: SpeechSynthesisVoice; lang = ''; rate = 1; pitch = 1; volume = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}
class Synthesis extends EventTarget {
  voices = [remote, zh, en];
  speaking = false; paused = false; pending = false;
  spoken: Utterance[] = [];
  current?: Utterance;
  getVoices = vi.fn(() => this.voices);
  speak = vi.fn((utterance: Utterance) => { this.spoken.push(utterance); this.current = utterance; this.speaking = true; });
  cancel = vi.fn(() => { this.current = undefined; this.speaking = false; });
  pause = vi.fn(() => { this.paused = true; });
  resume = vi.fn(() => { this.paused = false; });
  begin() { this.current?.onstart?.(); }
  end() { const current = this.current; this.current = undefined; this.speaking = false; current?.onend?.(); }
  available(voices: SpeechSynthesisVoice[]) { this.voices = voices; this.dispatchEvent(new Event('voiceschanged')); }
}
let synth: Synthesis;
const players: LocalTts[] = [];
function make(options: LocalTtsOptions = {}) { const player = new LocalTts(options); players.push(player); return player; }
beforeEach(() => { vi.useFakeTimers(); synth = new Synthesis(); vi.stubGlobal('speechSynthesis', synth); vi.stubGlobal('SpeechSynthesisUtterance', Utterance); });
afterEach(() => { players.splice(0).forEach(player => player.dispose()); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('plays complete sentences during streaming, flushes the tail, and resolves only after playback', async () => {
  const player = make(); const started = vi.fn(), completed = vi.fn();
  player.on('chunkstart', started); player.on('chunkend', completed);
  player.append('你好'); expect(synth.speak).not.toHaveBeenCalled(); expect(player.state).toBe('buffering');
  player.append('。第二句？尾段'); expect(synth.spoken.map(item => item.text)).toEqual(['你好。']);
  expect(player.snapshot).toMatchObject({ bufferedText: '尾段', queuedChunks: 1 });
  const done = player.finish(); const resolved = vi.fn(); void done.then(resolved);
  synth.begin(); expect(player.state).toBe('speaking'); expect(started).toHaveBeenCalledWith(expect.objectContaining({ text: '你好。', voiceURI: 'local-zh' }));
  synth.end(); expect(synth.spoken.map(item => item.text)).toEqual(['你好。', '第二句？']);
  synth.begin(); synth.end(); expect(synth.current?.text).toBe('尾段'); expect(resolved).not.toHaveBeenCalled();
  synth.begin(); synth.end(); await done;
  expect(player.state).toBe('ended'); expect(completed).toHaveBeenCalledTimes(3); expect(resolved).toHaveBeenCalledOnce();
  expect(synth.cancel).not.toHaveBeenCalled();
});
it('does not extend the maximum buffer wait on every incoming token', () => {
  const player = make({ flushDelay: 1000 });
  player.append('没有'); vi.advanceTimersByTime(600); player.append('标点'); vi.advanceTimersByTime(400);
  expect(synth.current?.text).toBe('没有标点');
});
it('supports cumulative text without replaying identical prefixes and rejects rewrites or mixed input', async () => {
  const player = make({ flushDelay: 0 });
  player.update('第一'); player.update('第一句。'); player.update('第一句。'); player.update('第一句。第二句。');
  expect(synth.spoken.map(item => item.text)).toEqual(['第一句。']);
  expect(() => player.update('改写第一句。')).toThrow(expect.objectContaining({ code: 'non-append-update' }));
  expect(() => player.append('混用')).toThrow(expect.objectContaining({ code: 'input-mode' }));
  const done = player.finish(); synth.end(); synth.end(); await done;
  expect(synth.spoken.map(item => item.text)).toEqual(['第一句。', '第二句。']);
  expect(() => player.update('迟到全文')).toThrow(expect.objectContaining({ code: 'stream-closed' }));
});
it('waits for asynchronous voices, filters remote voices, and explicitly uses a local voice', async () => {
  synth.voices = [];
  const player = make(); player.append('你好。'); const done = player.finish();
  synth.available([remote]); await Promise.resolve(); expect(synth.speak).not.toHaveBeenCalled();
  synth.available([remote, zh]); await Promise.resolve();
  expect(synth.current?.voice).toBe(zh); expect(player.getVoices()).toEqual([zh]);
  synth.end(); await done;
});
it('never falls back to a remote or different-language voice when no matching local voice exists', async () => {
  synth.voices = [remote, en];
  const player = make({ voiceTimeout: 50 }); const error = vi.fn(); player.on('error', error);
  player.append('你好。'); const rejected = expect(player.finish()).rejects.toMatchObject({ code: 'voice-unavailable' });
  await vi.advanceTimersByTimeAsync(50); await rejected;
  expect(synth.speak).not.toHaveBeenCalled(); expect(player.state).toBe('error'); expect(error).toHaveBeenCalledOnce();
});
it('supports explicit local voice selection and reports unsupported environments', async () => {
  const player = make({ voiceURI: 'local-en', rate: 1.3, pitch: .8, volume: .5 }); player.append('Hello!');
  expect(synth.current).toMatchObject({ voice: en, lang: 'en-US', rate: 1.3, pitch: .8, volume: .5 }); player.stop();
  vi.stubGlobal('speechSynthesis', undefined); const unsupported = make(); expect(unsupported.supported).toBe(false);
  await expect(unsupported.ready()).rejects.toMatchObject({ code: 'unsupported' });
});
it('pauses playback while continuing to receive text, then drains it after resume', async () => {
  const player = make(); player.append('第一句。'); synth.begin(); player.pause();
  expect(synth.pause).toHaveBeenCalledOnce(); expect(player.state).toBe('paused');
  player.append('第二句。'); const done = player.finish(); expect(synth.spoken).toHaveLength(1);
  player.resume(); expect(synth.resume).toHaveBeenCalledOnce(); synth.end(); synth.end(); await done;
  expect(player.state).toBe('ended');
});
it('can pause while buffering, before any utterance has started', async () => {
  const player = make(); player.pause(); player.append('暂停接收。'); const done = player.finish();
  expect(synth.pause).not.toHaveBeenCalled(); expect(synth.speak).not.toHaveBeenCalled();
  player.resume(); expect(synth.current?.text).toBe('暂停接收。'); synth.end(); await done;
});
it('stops, discards queued data, ignores late callbacks and rejects late appends until reset', async () => {
  const player = make(); player.append('第一句。第二句。'); const lateEnd = synth.current!.onend!, lateStart = synth.current!.onstart!;
  const rejected = expect(player.finish()).rejects.toMatchObject({ code: 'canceled' });
  player.pause(); player.stop(); await rejected; lateEnd(); lateStart(); vi.advanceTimersByTime(5000);
  expect(synth.spoken).toHaveLength(1); expect(synth.paused).toBe(false); expect(player.state).toBe('stopped');
  expect(() => player.append('迟到内容。')).toThrow(expect.objectContaining({ code: 'stream-closed' }));
  player.reset(); player.update('新消息。'); expect(synth.current?.text).toBe('新消息。');
});
it('does not allow one instance to pause or cancel another instance', () => {
  const first = make(), second = make(); first.append('第一实例。'); synth.begin();
  const error = vi.fn(); second.on('error', error); second.append('第二实例。');
  expect(error).toHaveBeenCalledWith(expect.objectContaining({ code: 'busy' })); second.stop(); second.dispose();
  expect(synth.cancel).not.toHaveBeenCalled(); expect(synth.current?.text).toBe('第一实例。');
  first.stop(); expect(synth.cancel).toHaveBeenCalledOnce();
});
it('refuses an externally occupied browser channel without canceling it', () => {
  synth.speaking = true; const player = make(); player.append('不抢占。');
  expect(player.state).toBe('error'); player.dispose(); expect(synth.cancel).not.toHaveBeenCalled();
});
it('reports native synthesis errors and never replays failed chunks automatically', async () => {
  const player = make(); player.append('句子。尾段'); const rejected = expect(player.finish()).rejects.toMatchObject({ code: 'not-allowed' });
  synth.current!.onerror?.({ error: 'not-allowed' }); await rejected;
  vi.advanceTimersByTime(5000); expect(synth.spoken).toHaveLength(1); expect(player.state).toBe('error');
});
it('disposes listeners and pending voice waits safely, and allows idempotent disposal', async () => {
  synth.voices = []; const player = make(); const rejected = expect(player.ready()).rejects.toMatchObject({ code: 'canceled' });
  const voices = vi.fn(); player.on('voiceschange', voices); player.dispose(); await rejected; player.dispose(); synth.available([zh]);
  expect(voices).not.toHaveBeenCalled(); expect(player.state).toBe('disposed');
  expect(() => player.append('销毁后')).toThrow(expect.objectContaining({ code: 'disposed' }));
});
it('respects cancellation from a state callback before submitting audio', () => {
  const player = make(); player.on('statechange', state => { if (state === 'buffering') player.stop(); });
  player.append('回调中停止。'); expect(synth.speak).not.toHaveBeenCalled(); expect(player.state).toBe('stopped');
});
it('handles empty streams, event unsubscription and validated options', async () => {
  const player = make(); const listener = vi.fn(); const off = player.on('end', listener); off();
  await player.finish(); await player.finish(); expect(listener).not.toHaveBeenCalled(); expect(player.state).toBe('ended');
  expect(() => new LocalTts({ maxChunkLength: 0 })).toThrow(LocalTtsError);
  expect(() => new LocalTts({ rate: NaN })).toThrow(LocalTtsError);
});
