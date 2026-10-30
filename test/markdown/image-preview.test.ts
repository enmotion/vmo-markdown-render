// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import Render from '../../components/markdown-render/markdown-render.vue';

const wrappers: VueWrapper[] = [];
const query = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
async function event(element: Element, name: string, options: Record<string, unknown> = {}) {
  const EventClass = name.startsWith('pointer') ? PointerEvent : name === 'contextmenu' ? MouseEvent : name === 'wheel' ? WheelEvent : name === 'keydown' ? KeyboardEvent : Event;
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
  const wrapper = setup({ style: { width: '600px' } }); const image = wrapper.get('img');
  (image.element as HTMLElement).focus(); document.body.style.overflow = 'auto'; await open(wrapper);
  const dialog = query('[role="dialog"]'); expect(dialog.parentElement).toBe(document.body); expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  expect(document.body.style.overflow).toBe('hidden'); expect(document.activeElement).toBe(dialog);
  expect(dialog.querySelector('button')).toBeNull(); expect(dialog.querySelector('output')?.textContent).toBe('100%');
  await event(dialog, 'keydown', { key: 'Tab' }); expect(document.activeElement).toBe(dialog);
  await event(dialog, 'keydown', { key: 'Tab', shiftKey: true }); expect(document.activeElement).toBe(dialog);
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
  expect(image.style.width).toBe('752px'); expect(image.style.height).toBe('376px');
  expect(image.style.opacity).toBe('1'); expect(query('[role="status"]')).toBeNull();
  await event(query('[role="dialog"]'), 'keydown', { key: '+' });
  Object.defineProperties(image, { naturalWidth: { value: 800 }, naturalHeight: { value: 400 } });
  await event(image, 'load');
  expect(query('output').textContent).toBe('125%');
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
  await event(query('[role="dialog"]'), 'keydown', { key: 'Escape' });
  expect(focus).toHaveBeenCalledOnce(); expect(document.body.style.overflow).toBe('');
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
  expect(Number(stage.getAttribute('data-x'))).toBeLessThanOrEqual(352); expect(Number(stage.getAttribute('data-y'))).toBeLessThanOrEqual(76);
  await event(stage, 'pointerup', { pointerId: 1 }); expect(query('[role="dialog"]')).not.toBeNull();
  await event(query('[role="dialog"]'), 'keydown', { key: '0' }); expect(stage.getAttribute('data-scale')).toBe('1'); expect(stage.getAttribute('data-x')).toBe('0');
});

it('pinches and translates together; adding another finger cancels long press', async () => {
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
  expect(query('output').textContent).toBe('100%');
  await event(stage, 'pointermove', { pointerId: 2, clientX: 550, clientY: 300 });
  expect(stage.getAttribute('data-scale')).toBe('2'); expect(query('output').textContent).toBe('200%');
  await event(stage, 'pointercancel', { pointerId: 2 });
  await event(image, 'pointerdown', { button: 0, pointerType: 'touch', pointerId: 3, clientX: Infinity, clientY: 300 });
  await event(stage, 'pointermove', { pointerId: 1, clientX: 360, clientY: 300 });
  expect(stage.getAttribute('data-scale')).toBe('2');
  expect(Number.isFinite(Number(stage.getAttribute('data-x')))).toBe(true);
});

it('ignores invalid wheel deltas without corrupting subsequent zoom', async () => {
  const wrapper = setup(); const stage = await open(wrapper);
  await event(stage, 'wheel', { deltaY: NaN, clientX: 400, clientY: 300 });
  expect(stage.getAttribute('data-scale')).toBe('1'); expect(query('output').textContent).toBe('100%');
  await event(query('[role="dialog"]'), 'keydown', { key: '+' });
  expect(stage.getAttribute('data-scale')).toBe('1.25'); expect(query('output').textContent).toBe('125%');
});

it('opens a download menu only for a stationary hold and cancels holds on movement or unmount', async () => {
  const wrapper = setup(); const stage = await open(wrapper), image = query('.md-image-preview__image');
  await event(image, 'pointerdown', { button: 0, pointerType: 'touch', pointerId: 1, clientX: 400, clientY: 300 });
  await vi.advanceTimersByTimeAsync(550); expect(query('.md-image-preview__menu')).not.toBeNull();
  await event(stage, 'pointerup', { pointerId: 1 }); expect(query('[role="dialog"]')).not.toBeNull();
  await event(image, 'pointerdown', { button: 0, pointerType: 'touch', pointerId: 2, clientX: 400, clientY: 300 });
  await event(stage, 'pointermove', { pointerId: 2, clientX: 420, clientY: 300 });
  await vi.advanceTimersByTimeAsync(600); expect(query('.md-image-preview__menu')).toBeNull();
  wrapper.unmount(); await vi.advanceTimersByTimeAsync(600); expect(query('[role="dialog"]')).toBeNull(); expect(document.body.style.overflow).toBe('');
});

it('releases a preview if its image changes or disappears and allows only one instance at a time', async () => {
  const one = setup(), two = setup(); await open(one); await open(two); await nextTick();
  expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1); expect(document.body.style.overflow).toBe('hidden');
  await two.setProps({ content: '![新图片](/new.png)' }); expect(query('[role="dialog"]')).toBeNull(); expect(document.body.style.overflow).toBe('');
  await open(one); await one.setProps({ content: '图片已删除' }); expect(query('[role="dialog"]')).toBeNull();
});

it('honors the long-press opt-out without requesting a download', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const wrapper = setup({ imagePreview: { longPressDownload: false } }); const stage = await open(wrapper);
  await event(query('.md-image-preview__image'), 'pointerdown', { button: 0, pointerType: 'touch', pointerId: 1, clientX: 400, clientY: 300 });
  await vi.advanceTimersByTimeAsync(600); expect(query('.md-image-preview__menu')).toBeNull(); expect(fetch).not.toHaveBeenCalled();
  await event(stage, 'pointerup', { pointerId: 1 });
});

it('shows image load errors and a usable original link when download is blocked', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('CORS')));
  const wrapper = setup(); await open(wrapper); await event(query('.md-image-preview__image'), 'error');
  expect(query('[role="alert"]').textContent).toContain('加载失败');
  await event(query('.md-image-preview__stage'), 'contextmenu', { clientX: 100, clientY: 100 });
  const button = [...document.querySelectorAll('button')].find(el => el.textContent === '下载图片')!; await event(button, 'click');
  await vi.advanceTimersByTimeAsync(0); expect(query('.md-image-preview__download-error').textContent).toContain('打开原图');
  expect(query<HTMLAnchorElement>('.md-image-preview__menu a').getAttribute('href')).toBe('/image.png');
});
