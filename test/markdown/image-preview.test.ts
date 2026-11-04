// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, inject, nextTick } from 'vue';
import Render from '../../components/markdown-render/markdown-render.vue';
import MarkdownImage from '../../components/markdown-render/nodes/image';
import { imagePreviewKey } from '../../components/markdown-render/image-preview/context';

const wrappers: VueWrapper[] = [];
const query = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
async function event(element: Element, name: string, options: Record<string, unknown> = {}) {
  const EventClass = name.startsWith('pointer') || name === 'lostpointercapture' ? PointerEvent : name === 'contextmenu' ? MouseEvent : name === 'wheel' ? WheelEvent : name === 'keydown' ? KeyboardEvent : Event;
  const dispatched = new EventClass(name, { bubbles: true, cancelable: true, ...options });
  // happy-dom's WheelEvent does not implement MouseEvent coordinates.
  if (name === 'wheel') for (const key of ['clientX', 'clientY']) Object.defineProperty(dispatched, key, { value: options[key] ?? 0 });
  element.dispatchEvent(dispatched); await nextTick();
}
function setup(props: Record<string, unknown> = {}) {
  const wrapper = mount(Render, { attachTo: document.body, props: { content: '![海边](/image.png "日落")', ...props } }); wrappers.push(wrapper); return wrapper;
}
async function open(wrapper: VueWrapper) {
  await wrapper.get('img').trigger('click'); await nextTick();
  const image = query<HTMLImageElement>('.md-image-preview__image');
  Object.defineProperties(image, { naturalWidth: { configurable: true, value: 800 }, naturalHeight: { configurable: true, value: 400 } });
  await event(image, 'load'); return query('.md-image-preview__stage');
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 } as DOMRect);
});
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; document.body.style.overflow = ''; });

it('teleports one dialog outside Render, traps focus and restores scrolling and focus on close', async () => {
  const wrapper = setup({ style: { width: '600px' }, imagePreview: { reference: false } }); const image = wrapper.get('img');
  (image.element as HTMLElement).focus(); document.body.style.overflow = 'auto'; await open(wrapper);
  const dialog = query('[role="dialog"]'); expect(dialog.parentElement).toBe(document.body); expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  expect(document.body.style.overflow).toBe('hidden'); expect(document.activeElement).toBe(dialog);
  expect(dialog.querySelector('button')?.getAttribute('aria-label')).toBe('关闭预览'); expect(dialog.querySelector('output')?.textContent).toBe('100%');
  await event(dialog, 'keydown', { key: 'Tab' }); expect(document.activeElement).toBe(dialog.querySelector('button'));
  await event(dialog, 'keydown', { key: 'Tab', shiftKey: true }); expect(document.activeElement).toBe(dialog.querySelector('button'));
  const stage = query('.md-image-preview__stage');
  await event(stage, 'pointerdown', { button: 0, pointerId: 1 }); await event(stage, 'pointerup', { pointerId: 1 });
  expect(query('[role="dialog"]')).not.toBeNull();
  await event(stage, 'click');
  expect(query('[role="dialog"]')).toBeNull(); expect(document.body.style.overflow).toBe('auto'); expect(document.activeElement).toBe(image.element);
  expect(wrapper.attributes('style')).toContain('width: 600px');
});

it('fits an already loaded source immediately and does not reset zoom on its preview load event', async () => {
  const wrapper = setup();
  Object.defineProperties(wrapper.get('img').element, {
    complete: { value: true }, naturalWidth: { value: 800 }, naturalHeight: { value: 400 },
  });
  await wrapper.get('img').trigger('click'); await nextTick();
  const image = query<HTMLImageElement>('.md-image-preview__image');
  expect(image.style.width).toBe('700px'); expect(image.style.height).toBe('350px');
  expect(image.style.opacity).toBe('1'); expect(query('[role="status"]')).toBeNull();
  await event(query('[role="dialog"]'), 'keydown', { key: '+' });
  Object.defineProperties(image, { naturalWidth: { value: 800 }, naturalHeight: { value: 400 } });
  await event(image, 'load');
  expect(query('.md-image-preview__percentage').textContent).toBe('125%');
});

it('locks scrolling before measuring and removes the overlay before restoring focus', async () => {
  const measured: string[] = [];
  const getRect = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('md-image-preview__stage')) measured.push(document.body.style.overflow);
    return getRect.call(this);
  });
  const wrapper = setup(), source = wrapper.get('img').element as HTMLElement;
  source.focus();
  const focus = vi.spyOn(source, 'focus').mockImplementation(() => { expect(query('[role="dialog"]')).toBeNull(); });
  await open(wrapper);
  expect(measured).toEqual(['hidden']);
  await event(query('.md-image-preview__close'), 'click');
  expect(focus).toHaveBeenCalledOnce(); expect(document.body.style.overflow).toBe('');
});

it('prepares decoding without delaying opening and can close while decoding is pending', async () => {
  let resolve!: () => void;
  const decode = vi.spyOn(HTMLImageElement.prototype, 'decode').mockReturnValue(new Promise<void>(done => { resolve = done; }));
  const wrapper = setup(); await open(wrapper);
  expect(decode).toHaveBeenCalledOnce();
  expect(decode.mock.instances[0]).toBe(query('.md-image-preview__image'));
  expect(document.activeElement).toBe(query('[role="dialog"]'));
  await event(query('[role="dialog"]'), 'keydown', { key: 'Escape' });
  expect(query('[role="dialog"]')).toBeNull();
  resolve(); await nextTick();
  expect(query('[role="dialog"]')).toBeNull();
});

it('updates dragging only after movement, without toggling it for stationary clicks', async () => {
  const wrapper = setup(); const stage = await open(wrapper), image = query('.md-image-preview__image');
  await event(image, 'pointerdown', { button: 0, pointerId: 1, clientX: 400, clientY: 300 });
  expect(stage.classList.contains('is-dragging')).toBe(false);
  await event(stage, 'pointermove', { pointerId: 1, clientX: 402, clientY: 300 });
  expect(stage.classList.contains('is-dragging')).toBe(false);
  await event(stage, 'pointermove', { pointerId: 1, clientX: 420, clientY: 300 });
  expect(stage.classList.contains('is-dragging')).toBe(true);
  await event(stage, 'pointerup', { pointerId: 1 });
  expect(stage.classList.contains('is-dragging')).toBe(false);
  await event(stage, 'click'); expect(query('[role="dialog"]')).not.toBeNull();
});

it('preserves disabled, linked and unsafe image behavior', async () => {
  const wrapper = setup({ imagePreview: false, onLinkClick: ({ event }: { event: MouseEvent }) => event.preventDefault() }); await wrapper.get('img').trigger('click'); expect(query('[role="dialog"]')).toBeNull();
  expect(wrapper.get('img').attributes('tabindex')).toBeUndefined();
  await wrapper.setProps({ imagePreview: true, content: '[![图片](/image.png)](/destination)' });
  expect(wrapper.get('img').attributes('role')).toBeUndefined(); expect(wrapper.get('img').attributes('tabindex')).toBeUndefined();
  wrapper.get('a').element.addEventListener('click', e => e.preventDefault());
  await wrapper.get('img').trigger('click'); expect(query('[role="dialog"]')).toBeNull(); expect(wrapper.emitted('link-click')).toHaveLength(1);
  await wrapper.setProps({ content: '::image[x]{src="javascript:alert(1)"}' });
  await wrapper.get('img').trigger('click'); expect(query('[role="dialog"]')).toBeNull();
});

it('updates theme and configured background while open, and disables a live preview', async () => {
  const wrapper = setup({ theme: 'light', imagePreview: { background: { light: '#eeeeee', dark: '#222222' } } }); await open(wrapper);
  expect(query('.md-image-preview').style.background).toBe('#eeeeee');
  await wrapper.setProps({ theme: 'dark' }); await nextTick();
  expect(query('.md-image-preview').getAttribute('data-theme')).toBe('dark'); expect(query('.md-image-preview').style.background).toBe('#222222');
  await wrapper.setProps({ imagePreview: { enabled: false } }); expect(query('[role="dialog"]')).toBeNull(); expect(document.body.style.overflow).toBe('');
});

it('zooms around the pointer, clamps panning and resets to fit', async () => {
  const wrapper = setup({ imagePreview: { maxScale: 2 } }); const stage = await open(wrapper);
  await event(stage, 'wheel', { deltaY: -1000, clientX: 450, clientY: 300 });
  expect(stage.getAttribute('data-scale')).toBe('2'); expect(Number(stage.getAttribute('data-x'))).toBeCloseTo(-50);
  const image = query('.md-image-preview__image');
  await event(image, 'pointerdown', { button: 0, pointerId: 1, clientX: 400, clientY: 300 });
  await event(stage, 'pointermove', { pointerId: 1, clientX: 4000, clientY: 3000 });
  expect(Number(stage.getAttribute('data-x'))).toBeLessThanOrEqual(300); expect(Number(stage.getAttribute('data-y'))).toBeLessThanOrEqual(50);
  await event(stage, 'pointerup', { pointerId: 1 }); expect(query('[role="dialog"]')).not.toBeNull();
  await event(query('[role="dialog"]'), 'keydown', { key: '0' }); expect(stage.getAttribute('data-scale')).toBe('1'); expect(stage.getAttribute('data-x')).toBe('0');
});

it('pinches and translates together without opening an action menu', async () => {
  const wrapper = setup(); const stage = await open(wrapper), image = query('.md-image-preview__image');
  await event(image, 'pointerdown', { button: 0, pointerType: 'touch', pointerId: 1, clientX: 350, clientY: 300 });
  await event(image, 'pointerdown', { button: 0, pointerType: 'touch', pointerId: 2, clientX: 450, clientY: 300 });
  await event(stage, 'pointermove', { pointerId: 1, clientX: 310, clientY: 320 });
  await event(stage, 'pointermove', { pointerId: 2, clientX: 510, clientY: 320 });
  expect(Number(stage.getAttribute('data-scale'))).toBeCloseTo(2); expect(Number(stage.getAttribute('data-x'))).toBeCloseTo(10); expect(Number(stage.getAttribute('data-y'))).toBeCloseTo(20);
  await vi.advanceTimersByTimeAsync(600); expect(query('.md-image-preview__menu')).toBeNull();
  await event(stage, 'pointercancel', { pointerId: 1 }); await event(stage, 'pointerup', { pointerId: 2 }); expect(query('[role="dialog"]')).not.toBeNull();
});

it('ignores invalid touch coordinates and keeps pinch zoom usable afterwards', async () => {
  const wrapper = setup(); const stage = await open(wrapper), image = query('.md-image-preview__image');
  await event(image, 'pointerdown', { button: 0, pointerType: 'touch', pointerId: 1, clientX: 350, clientY: 300 });
  await event(image, 'pointerdown', { button: 0, pointerType: 'touch', pointerId: 2, clientX: 450, clientY: 300 });
  await event(stage, 'pointermove', { pointerId: 2, clientX: NaN, clientY: 300 });
  expect(stage.getAttribute('data-scale')).toBe('1');
  expect(stage.getAttribute('data-x')).toBe('0'); expect(stage.getAttribute('data-y')).toBe('0');
  expect(query('.md-image-preview__percentage').textContent).toBe('100%');
  await event(stage, 'pointermove', { pointerId: 2, clientX: 550, clientY: 300 });
  expect(stage.getAttribute('data-scale')).toBe('2'); expect(query('.md-image-preview__percentage').textContent).toBe('200%');
  await event(stage, 'pointercancel', { pointerId: 2 });
  await event(image, 'pointerdown', { button: 0, pointerType: 'touch', pointerId: 3, clientX: Infinity, clientY: 300 });
  await event(stage, 'pointermove', { pointerId: 1, clientX: 360, clientY: 300 });
  expect(stage.getAttribute('data-scale')).toBe('2');
  expect(Number.isFinite(Number(stage.getAttribute('data-x')))).toBe(true);
});

it('ignores invalid wheel deltas without corrupting subsequent zoom', async () => {
  const wrapper = setup(); const stage = await open(wrapper);
  await event(stage, 'wheel', { deltaY: NaN, clientX: 400, clientY: 300 });
  expect(stage.getAttribute('data-scale')).toBe('1'); expect(query('.md-image-preview__percentage').textContent).toBe('100%');
  await event(query('[role="dialog"]'), 'keydown', { key: '+' });
  expect(stage.getAttribute('data-scale')).toBe('1.25'); expect(query('.md-image-preview__percentage').textContent).toBe('125%');
});

it('releases a preview if its image changes or disappears and allows only one instance at a time', async () => {
  const one = setup(), two = setup(); await open(one); await open(two); await nextTick();
  expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1); expect(document.body.style.overflow).toBe('hidden');
  await two.setProps({ content: '![新图片](/new.png)' }); expect(query('[role="dialog"]')).toBeNull(); expect(document.body.style.overflow).toBe('');
  await open(one); await one.setProps({ content: '图片已删除' }); expect(query('[role="dialog"]')).toBeNull();
});

it('supports keyboard image activation, missing alt text and linked images', async () => {
  const wrapper = setup({ content: '![](/image.png)' });
  await wrapper.get('img').trigger('keydown', { key: 'ArrowRight' }); expect(query('[role="dialog"]')).toBeNull();
  await wrapper.get('img').trigger('keydown', { key: 'Enter' });
  expect(query('[role="dialog"]').getAttribute('aria-label')).toBe('图片预览');
  await event(query('[role="dialog"]'), 'keydown', { key: 'Escape' });
  await wrapper.get('img').trigger('keydown', { key: ' ' }); expect(query('[role="dialog"]')).not.toBeNull();
  await event(query('[role="dialog"]'), 'keydown', { key: 'Escape' });
  const open = vi.fn();
  const nested = mount(defineComponent({ setup() { return () => h('a', { href: '/destination' }, [h(MarkdownImage, { src: '/image.png' })]); } }), {
    global: { provide: { [imagePreviewKey as symbol]: { enabled: { value: true }, open, close: vi.fn() } } },
  }); wrappers.push(nested);
  await nested.get('img').trigger('keydown', { key: 'Enter' }); expect(open).not.toHaveBeenCalled();
});

it('suppresses context menus during dragging or touch contextmenu events and handles lost capture', async () => {
  const wrapper = setup(); const stage = await open(wrapper), image = query('.md-image-preview__image');
  await event(image, 'pointerdown', { button: 0, pointerId: 1, clientX: 400, clientY: 300 });
  await event(stage, 'pointermove', { pointerId: 1, clientX: 420, clientY: 300 });
  await event(stage, 'contextmenu'); expect(query('.md-image-preview__menu')).toBeNull();
  await event(stage, 'lostpointercapture', { pointerId: 1 });
  await event(stage, 'pointerup', { pointerId: 999 }); expect(stage.classList.contains('is-dragging')).toBe(false);
  stage.dispatchEvent(new PointerEvent('contextmenu', { bubbles: true, pointerType: 'touch' })); await nextTick();
  expect(query('.md-image-preview__menu')).toBeNull();
});

it('preserves palette fallbacks before mount and reads host backgrounds and CSS variables', async () => {
  const Opener = defineComponent({ setup() { const preview = inject(imagePreviewKey)!; preview.open({ src: '/early.png' }, Symbol()); return () => h('span'); } });
  const early = setup({ content: '<opener></opener>', components: { opener: Opener }, theme: 'dark' }); await nextTick();
  expect(query('.md-image-preview').style.background).toBe('#151821'); early.unmount();
  for (const [style, background] of [
    [{ background: '#123456' }, '#123456'],
    [{ background: 'transparent', '--md-background': '#234567' }, '#234567'],
    [{ background: 'rgba(0, 0, 0, 0)', '--md-default-bg': '#345678' }, '#345678'],
  ] as const) {
    const wrapper = setup({ style }); await open(wrapper); expect(query('.md-image-preview').style.background).toBe(background); wrapper.unmount();
  }
  const override = setup({ imagePreview: { background: '#456789' } }); await open(override); expect(query('.md-image-preview').style.background).toBe('#456789');
});

it('suppresses right-click and touch-hold menus, including legacy enabled configuration, without downloading', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  for (const longPressDownload of [true, false]) {
    const wrapper = setup({ imagePreview: { longPressDownload } }); const stage = await open(wrapper);
    const image = query('.md-image-preview__image');
    const context = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    image.dispatchEvent(context); expect(context.defaultPrevented).toBe(true);
    await event(image, 'pointerdown', { button: 0, pointerType: 'touch', pointerId: 1, clientX: 400, clientY: 300 });
    await vi.advanceTimersByTimeAsync(1200);
    expect(query('.md-image-preview__menu')).toBeNull(); expect(fetch).not.toHaveBeenCalled();
    await event(stage, 'pointerup', { pointerId: 1 });
    wrapper.unmount();
  }
});

it('shows image load failure without the removed action menu', async () => {
  const wrapper = setup(); await open(wrapper);
  await event(query('.md-image-preview__image'), 'error');
  expect(query('[role="alert"]').textContent).toBe('图片加载失败，请稍后重试。');
  expect(query('.md-image-preview__menu')).toBeNull();
});

it('shows a read-only percentage that follows zoom and preserves keyboard shortcuts', async () => {
  const wrapper = setup({ imagePreview: { maxScale: 2 } }); const stage = await open(wrapper), dialog = query('[role="dialog"]');
  expect(dialog.querySelector('input')).toBeNull();
  expect(query('.md-image-preview__percentage').textContent).toBe('100%');
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) await event(dialog, 'keydown', { key: '+', [modifier]: true });
  expect(stage.getAttribute('data-scale')).toBe('1');
  await event(dialog, 'keydown', { key: '=' }); expect(query('.md-image-preview__percentage').textContent).toBe('125%');
  await event(dialog, 'keydown', { key: '-' }); expect(query('.md-image-preview__percentage').textContent).toBe('100%');
  await event(dialog, 'keydown', { key: 'Tab', shiftKey: true }); expect(document.activeElement).toBe(dialog.querySelector('button'));
});

it('defaults to a 200% ceiling and clamps legacy or invalid maxScale options to the new range', async () => {
  for (const [maxScale, expected] of [[undefined, 2], [8, 2], [Infinity, 2], [NaN, 2], [0, 1], [1.5, 1.5]] as const) {
    const wrapper = setup({ imagePreview: { maxScale } }); const stage = await open(wrapper);
    await event(stage, 'wheel', { deltaY: -10000, clientX: 400, clientY: 300 });
    expect(Number(stage.getAttribute('data-scale'))).toBe(expected);
    expect(query('.md-image-preview__percentage').textContent).toBe(`${expected * 100}%`);
    wrapper.unmount();
  }
});
