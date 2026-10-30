// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import SpeechWave from '../../components/speech-wave/speech-wave.vue';

const wrappers: VueWrapper[] = [];
let frames: Map<number, FrameRequestCallback>;
let nextId: number;
let ctx: CanvasRenderingContext2D;
let gradient: { addColorStop: ReturnType<typeof vi.fn> };
let reduced = false;
const mediaListeners = new Set<() => void>();
const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');
beforeEach(() => {
  frames = new Map(); nextId = 0; reduced = false; mediaListeners.clear();
  gradient = { addColorStop: vi.fn() };
  ctx = { setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), createLinearGradient: vi.fn(() => gradient) } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 200, height: 56 } as DOMRect);
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frames.set(++nextId, callback); return nextId; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)));
  vi.stubGlobal('devicePixelRatio', 2);
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, callback: () => void) => mediaListeners.add(callback), removeEventListener: (_: string, callback: () => void) => mediaListeners.delete(callback) }));
});
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (originalHidden) Object.defineProperty(document, 'hidden', originalHidden); else Reflect.deleteProperty(document, 'hidden');
});
function tick(time: number) { const [id, callback] = [...frames][0]; frames.delete(id); callback(time); }
it('draws an idle line without a frame loop, then animates only while active', async () => {
  const wrapper = mount(SpeechWave); wrappers.push(wrapper);
  expect(ctx.stroke).toHaveBeenCalledTimes(3); expect(frames.size).toBe(0);
  expect(wrapper.attributes('aria-hidden')).toBe('true');
  await wrapper.setProps({ active: true, level: 1 }); expect(frames.size).toBe(1);
  tick(16); tick(32); expect(frames.size).toBe(1);
  expect(vi.mocked(ctx.lineTo).mock.calls.some(([, y]) => Math.abs(y - 28) > 2)).toBe(true);
  await wrapper.setProps({ active: false }); expect(frames.size).toBe(0);
  const calls = vi.mocked(ctx.stroke).mock.calls.length; wrapper.unmount(); expect(frames.size).toBe(0); expect(vi.mocked(ctx.stroke).mock.calls).toHaveLength(calls);
});
it('applies custom colors and rescales its backing store for device pixel ratio and height', async () => {
  const wrapper = mount(SpeechWave, { props: { colors: ['#ff0000', '#00ff00'] } }); wrappers.push(wrapper);
  const canvas = wrapper.element as HTMLCanvasElement;
  expect(canvas.width).toBe(400); expect(canvas.height).toBe(112);
  expect(gradient.addColorStop).toHaveBeenCalledWith(0, '#ff0000'); expect(gradient.addColorStop).toHaveBeenCalledWith(1, '#00ff00');
  await wrapper.setProps({ colors: ['#123456'], height: 80 }); expect(ctx.strokeStyle).toBe('#123456'); expect(canvas.height).toBe(160);
});
it('respects reduced motion and stops scheduling frames while the page is hidden', async () => {
  reduced = true;
  const wrapper = mount(SpeechWave, { props: { active: true, level: .7 } }); wrappers.push(wrapper); expect(frames.size).toBe(0);
  reduced = false; mediaListeners.forEach(callback => callback()); expect(frames.size).toBe(1);
  Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); expect(frames.size).toBe(0);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); expect(frames.size).toBe(1);
  wrapper.unmount(); expect(frames.size).toBe(0); expect(mediaListeners.size).toBe(0);
});
it('handles missing canvas support and invalid levels without requesting microphone access', async () => {
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValueOnce(null);
  const missing = mount(SpeechWave, { props: { active: true } }); wrappers.push(missing); expect(frames.size).toBe(0);
  const wrapper = mount(SpeechWave, { props: { active: true, level: 0 } }); wrappers.push(wrapper);
  expect(frames.size).toBe(0);
  expect(vi.mocked(ctx.lineTo).mock.calls.every(([, y]) => y === 28)).toBe(true);
  await wrapper.setProps({ level: 10, colors: [] }); tick(16);
  expect(vi.mocked(ctx.lineTo).mock.calls.every(([, y]) => Number.isFinite(y))).toBe(true);
});
it('does not invent volume when active without a measured level, and settles to silence', async () => {
  const wrapper = mount(SpeechWave, { props: { active: true } }); wrappers.push(wrapper);
  expect(frames.size).toBe(0); expect(wrapper.attributes('data-level')).toBe('0');
  await wrapper.setProps({ level: .8 }); tick(16); expect(frames.size).toBe(1);
  await wrapper.setProps({ level: 0 });
  for (let i = 0; i < 100 && frames.size; i++) tick(32 + i * 16);
  expect(frames.size).toBe(0);
  vi.mocked(ctx.lineTo).mockClear(); await wrapper.setProps({ colors: ['#ff0000'] });
  expect(vi.mocked(ctx.lineTo).mock.calls.every(([, y]) => y === 28)).toBe(true);
  await wrapper.setProps({ level: NaN }); expect(frames.size).toBe(0); expect(wrapper.attributes('data-level')).toBe('0');
});

it('renders speech peaks immediately with adjustable gain and no drawing outside the canvas', async () => {
  const wrapper = mount(SpeechWave, { props: { active: true, level: .35, speed: 0, intensity: 1 } }); wrappers.push(wrapper);
  const extent = () => Math.max(...vi.mocked(ctx.lineTo).mock.calls.map(([, y]) => Math.abs(y - 28)));
  const normal = extent(); expect(normal).toBeGreaterThan(5); expect(frames.size).toBe(0);
  vi.mocked(ctx.lineTo).mockClear(); await wrapper.setProps({ intensity: 2.5 });
  expect(extent()).toBeGreaterThan(normal * 1.6); expect(wrapper.attributes('data-level')).toBe('0.35');
  vi.mocked(ctx.lineTo).mockClear(); await wrapper.setProps({ level: 1, intensity: 100 });
  expect(extent()).toBeGreaterThan(20); expect(vi.mocked(ctx.lineTo).mock.calls.every(([, y]) => y >= 2 && y <= 54)).toBe(true);
  vi.mocked(ctx.lineTo).mockClear(); await wrapper.setProps({ intensity: 0 });
  expect(extent()).toBe(0); expect(frames.size).toBe(0);
});

it('changes the waveform visibly within one frame and honors speed zero', async () => {
  const wrapper = mount(SpeechWave, { props: { active: true, level: .7 } }); wrappers.push(wrapper);
  vi.mocked(ctx.lineTo).mockClear(); tick(0); const first = vi.mocked(ctx.lineTo).mock.calls.map(([, y]) => y);
  vi.mocked(ctx.lineTo).mockClear(); tick(16); const second = vi.mocked(ctx.lineTo).mock.calls.map(([, y]) => y);
  const change = second.reduce((total, y, i) => total + Math.abs(y - first[i]), 0) / first.length;
  expect(change).toBeGreaterThan(1.5);
  await wrapper.setProps({ speed: 0 }); expect(frames.size).toBe(0);
  vi.mocked(ctx.lineTo).mockClear(); await wrapper.setProps({ level: 0 });
  expect(vi.mocked(ctx.lineTo).mock.calls.every(([, y]) => y === 28)).toBe(true);
});
