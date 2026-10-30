// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { microphoneLevel, useMicrophoneLevel } from '../../components/speech-input/use-microphone-level';

let frames: Map<number, FrameRequestCallback>;
let frameId: number;
let signal: number;
let contexts: Context[];
let tracks: { stop: ReturnType<typeof vi.fn> }[];
const wrappers: VueWrapper[] = [];
const getUserMedia = vi.fn();
const originalDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
class Context {
  state = 'suspended';
  resume = vi.fn(async () => { this.state = 'running'; });
  close = vi.fn(async () => { this.state = 'closed'; });
  source = { connect: vi.fn(), disconnect: vi.fn() };
  analyser = { fftSize: 1024, disconnect: vi.fn(), getFloatTimeDomainData: vi.fn((samples: Float32Array) => samples.fill(signal)) };
  createAnalyser = vi.fn(() => this.analyser);
  createMediaStreamSource = vi.fn(() => this.source);
  constructor() { contexts.push(this); }
}
function stream() {
  const track = { stop: vi.fn() }; tracks.push(track);
  return { getTracks: () => [track] } as unknown as MediaStream;
}
function setup() {
  let meter!: ReturnType<typeof useMicrophoneLevel>;
  const report = vi.fn();
  const wrapper = mount(defineComponent({ setup() { meter = useMicrophoneLevel(report); return () => h('div', meter.level.value); } })); wrappers.push(wrapper);
  return { meter, report, wrapper };
}
function tick(time: number) {
  for (const [id, callback] of [...frames]) { frames.delete(id); callback(time); }
}
beforeEach(() => {
  frames = new Map(); frameId = 0; signal = .01; contexts = []; tracks = [];
  getUserMedia.mockReset().mockImplementation(async () => stream());
  vi.stubGlobal('AudioContext', Context);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.unstubAllGlobals();
  if (originalDevices) Object.defineProperty(navigator, 'mediaDevices', originalDevices); else Reflect.deleteProperty(navigator, 'mediaDevices');
});
it('normalizes measured RMS without turning silence into an animation', () => {
  expect(microphoneLevel(new Float32Array())).toBe(0);
  expect(microphoneLevel(new Float32Array([0, 0]))).toBe(0);
  expect(microphoneLevel(new Float32Array([.001, -.001]))).toBeCloseTo(0);
  expect(microphoneLevel(new Float32Array([.01, -.01]))).toBeCloseTo(1 / 3);
  expect(microphoneLevel(new Float32Array([.1, -.1]))).toBeCloseTo(2 / 3);
  expect(microphoneLevel(new Float32Array([2, -2]))).toBe(1);
  expect(microphoneLevel(new Float32Array([NaN, Infinity]))).toBe(0);
});
it('follows actual analyser samples and releases the graph and every track on stop', async () => {
  const { meter, report } = setup(); await meter.start();
  expect(meter.levelState.value).toBe('active'); expect(getUserMedia).toHaveBeenCalledWith({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false }, video: false });
  tick(0); const quiet = meter.level.value; expect(quiet).toBeGreaterThan(0);
  signal = .5; tick(32); expect(meter.level.value).toBeGreaterThan(quiet);
  signal = 0; for (let i = 2; i < 45; i++) tick(i * 32);
  expect(meter.level.value).toBe(0);
  expect(contexts[0].source.connect).toHaveBeenCalledOnce(); expect(contexts[0].source.connect).toHaveBeenCalledWith(contexts[0].analyser);
  meter.stop(); expect(meter.levelState.value).toBe('idle'); expect(frames.size).toBe(0);
  expect(tracks[0].stop).toHaveBeenCalledOnce(); expect(contexts[0].source.disconnect).toHaveBeenCalledOnce(); expect(contexts[0].close).toHaveBeenCalledOnce(); expect(report).not.toHaveBeenCalled();
});
it('releases a late permission grant without disturbing a newer session', async () => {
  let grant!: (value: MediaStream) => void;
  getUserMedia.mockImplementationOnce(() => new Promise<MediaStream>(resolve => { grant = resolve; }));
  const { meter } = setup(); const pending = meter.start(); expect(meter.levelState.value).toBe('requesting');
  meter.stop(); await meter.start(); expect(meter.levelState.value).toBe('active');
  grant(stream()); await pending;
  expect(tracks[1].stop).toHaveBeenCalledOnce(); expect(tracks[0].stop).not.toHaveBeenCalled();
  expect(contexts[0].createMediaStreamSource).not.toHaveBeenCalled(); expect(meter.levelState.value).toBe('active'); expect(frames.size).toBe(1);
});
it('follows a short burst within a frame and releases quickly enough to show syllable gaps', async () => {
  const { meter } = setup(); signal = 0; await meter.start(); tick(0);
  signal = .5; tick(16); const target = microphoneLevel(new Float32Array([signal]));
  expect(meter.level.value).toBeGreaterThan(target * .8);
  signal = 0; for (let time = 32; time <= 176; time += 16) tick(time);
  expect(meter.level.value).toBeLessThan(.02);
});
it('closes pending and active sessions on unmount', async () => {
  let grant!: (value: MediaStream) => void;
  getUserMedia.mockImplementationOnce(() => new Promise<MediaStream>(resolve => { grant = resolve; }));
  const { meter, wrapper } = setup(); const pending = meter.start(); wrapper.unmount();
  expect(contexts[0].close).toHaveBeenCalledOnce(); grant(stream()); await pending; expect(tracks[0].stop).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
  const active = setup(); await active.meter.start(); active.wrapper.unmount(); expect(tracks[1].stop).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
});
it('reports microphone denial independently and can retry', async () => {
  getUserMedia.mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'));
  const { meter, report } = setup(); await meter.start();
  expect(meter.level.value).toBe(0); expect(meter.levelState.value).toBe('error'); expect(meter.levelError.value?.code).toBe('level-not-allowed');
  expect(report).toHaveBeenCalledOnce(); expect(contexts[0].close).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
  await meter.start(); expect(meter.levelError.value).toBeUndefined(); expect(meter.levelState.value).toBe('active');
});
it('cleans up when audio cannot run or sampling fails', async () => {
  const { meter, report } = setup();
  const pending = meter.start(); contexts[0].state = 'suspended'; await pending;
  expect(meter.levelState.value).toBe('error'); expect(tracks[0].stop).toHaveBeenCalledOnce();
  await meter.start(); contexts[1].analyser.getFloatTimeDomainData.mockImplementation(() => { throw new Error('Device lost'); }); tick(0);
  expect(meter.level.value).toBe(0); expect(meter.levelState.value).toBe('error'); expect(tracks[1].stop).toHaveBeenCalledOnce(); expect(report).toHaveBeenCalledTimes(2); expect(frames.size).toBe(0);
  await flushPromises();
});
