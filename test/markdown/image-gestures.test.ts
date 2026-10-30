// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { useImageGestures } from '../../components/markdown-render/image-preview/use-image-gestures';

const wrappers: VueWrapper[] = [];
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.unstubAllGlobals(); });

function setup(element?: HTMLElement) {
  const stage = ref(element), natural = ref({ x: 800, y: 400 }), maximum = ref(8);
  let gestures!: ReturnType<typeof useImageGestures>;
  const wrapper = mount(defineComponent({ setup() {
    gestures = useImageGestures(stage, natural, maximum, ref(false), vi.fn(), vi.fn());
    return () => h('span', gestures.scale.value);
  } })); wrappers.push(wrapper);
  return { gestures, stage, maximum };
}

it('can initialize during SSR without a browser viewport', async () => {
  vi.stubGlobal('window', undefined);
  const app = createSSRApp({ setup() {
    const gestures = useImageGestures(ref(), ref({ x: 0, y: 0 }), ref(8), ref(false), vi.fn(), vi.fn());
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
  expect(gestures.scale.value).toBeCloseTo(Math.exp(Math.min(1000, window.innerHeight) * .002));
  gestures.zoom(8); maximum.value = 2; await nextTick(); expect(gestures.scale.value).toBe(2);
  gestures.down(new PointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 10, clientY: 10 }));
  gestures.up(new PointerEvent('lostpointercapture', { pointerId: 1 })); expect(gestures.dragging.value).toBe(false);
});
