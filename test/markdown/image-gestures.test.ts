// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { useImageGestures } from '../../components/markdown-render/image-preview/use-image-gestures';

const wrappers: VueWrapper[] = [];
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.unstubAllGlobals(); });

function setup(element?: HTMLElement, dimensions = { x: 800, y: 400 }) {
  const stage = ref(element), natural = ref(dimensions), maximum = ref(2);
  let gestures!: ReturnType<typeof useImageGestures>;
  const wrapper = mount(defineComponent({ setup() {
    gestures = useImageGestures(stage, natural, maximum, vi.fn());
    return () => h('span', gestures.scale.value);
  } })); wrappers.push(wrapper);
  return { gestures, stage, maximum };
}

it('can initialize during SSR without a browser viewport', async () => {
  vi.stubGlobal('window', undefined);
  const app = createSSRApp({ setup() {
    const gestures = useImageGestures(ref(), ref({ x: 0, y: 0 }), ref(2), vi.fn());
    return () => h('span', `${gestures.scale.value}:${gestures.size.value.x}`);
  } });
  expect(await renderToString(app)).toBe('<span>1:0</span>');
});

it('tolerates an absent stage and repeated identical measurements', () => {
  const { gestures } = setup(); window.dispatchEvent(new Event('resize'));
  gestures.down(new PointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 10, clientY: 10 }));
  gestures.up(new PointerEvent('pointercancel', { pointerId: 1 }));
  gestures.up(new PointerEvent('pointerup', { pointerId: 999 }));
  expect(gestures.scale.value).toBe(1); expect(gestures.dragging.value).toBe(false);
});

it('normalizes wheel lines and pages and responds to a lower maximum scale', async () => {
  const element = document.createElement('div');
  element.getBoundingClientRect = () => ({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight } as DOMRect);
  element.setPointerCapture = () => { throw new Error('Capture unavailable'); };
  const { gestures, maximum } = setup(element);
  window.dispatchEvent(new Event('resize'));
  function wheel(deltaMode: number) {
    const event = new WheelEvent('wheel', { deltaY: -1, deltaMode });
    Object.defineProperties(event, { clientX: { value: 0 }, clientY: { value: 0 } });
    gestures.wheel(event);
  }
  wheel(1);
  expect(gestures.scale.value).toBeCloseTo(Math.exp(.032));
  gestures.reset();
  wheel(2);
  expect(gestures.scale.value).toBeCloseTo(Math.min(2, Math.exp(Math.min(1000, window.innerHeight) * .002)));
  gestures.zoom(8); maximum.value = 1.5; await nextTick(); expect(gestures.scale.value).toBe(1.5);
  gestures.down(new PointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 10, clientY: 10 }));
  gestures.up(new PointerEvent('lostpointercapture', { pointerId: 1 })); expect(gestures.dragging.value).toBe(false);
});

it('fits large, wide, tall and small images within 50px margins without upscaling the original', () => {
  for (const [width, height, fittedWidth, fittedHeight] of [
    [1600, 400, 700, 175], [400, 1600, 125, 500], [1600, 1200, 500 * 4 / 3, 500], [200, 100, 200, 100], [700, 500, 700, 500],
  ]) {
    const element = document.createElement('div');
    element.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 } as DOMRect);
    const { gestures } = setup(element, { x: width, y: height });
    expect(gestures.size.value.x).toBeCloseTo(fittedWidth); expect(gestures.size.value.y).toBeCloseTo(fittedHeight);
    gestures.zoom(.01); expect(gestures.scale.value).toBe(1);
    gestures.zoom(99); expect(gestures.scale.value).toBe(2);
    expect((gestures.size.value.x * gestures.scale.value) * (gestures.size.value.y * gestures.scale.value) / (fittedWidth * fittedHeight)).toBeCloseTo(4);
  }
});

it('uses the full viewport for zoomed panning and recomputes the 50px fit on resize', () => {
  let width = 800, height = 600;
  const element = document.createElement('div');
  element.getBoundingClientRect = () => ({ left: 0, top: 0, width, height } as DOMRect);
  const { gestures } = setup(element, { x: 1600, y: 1200 });
  gestures.zoom(2);
  gestures.down(new PointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 400, clientY: 300 }));
  gestures.move(new PointerEvent('pointermove', { pointerId: 1, clientX: 10000, clientY: 10000 }));
  const left = () => width / 2 + gestures.x.value - gestures.size.value.x * gestures.scale.value / 2;
  const top = () => height / 2 + gestures.y.value - gestures.size.value.y * gestures.scale.value / 2;
  expect(left()).toBeCloseTo(0); expect(top()).toBeCloseTo(0);
  gestures.up(new PointerEvent('pointerup', { pointerId: 1 }));
  width = 500; height = 400; window.dispatchEvent(new Event('resize'));
  expect(gestures.size.value.x).toBeLessThanOrEqual(400); expect(gestures.size.value.y).toBeLessThanOrEqual(300);
  expect(left()).toBeCloseTo(0); expect(top()).toBeCloseTo(0);
  gestures.reset(); expect(gestures.scale.value).toBe(1); expect(left()).toBeGreaterThanOrEqual(50); expect(top()).toBeGreaterThanOrEqual(50);
});
