// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { MarkdownImage, MarkdownRender } from '../../index';
import type { ImageReference } from '../../index';

const wrappers: VueWrapper[] = [];
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
async function reference(wrapper: VueWrapper) {
  await wrapper.get('.md-image-reference').trigger('click');
}
function image(props = {}) {
  const wrapper = mount(MarkdownImage, { attachTo: document.body, props: { src: '/image.png', alt: '海边', title: '日落', ...props } });
  wrappers.push(wrapper); return wrapper;
}
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks(); });

it('standalone image previews without Render and emits exactly one typed reference per activation', async () => {
  const wrapper = image({ width: '60%', class: 'host-image', style: { borderRadius: '10px' } });
  expect(wrapper.get('img').classes()).toContain('host-image');
  expect(wrapper.get('.md-image-container').attributes('style')).toContain('width: 60%');
  expect(wrapper.get('.md-image-reference').attributes()).toMatchObject({ title: '引用图片', 'aria-label': '引用图片' });
  expect(wrapper.get('.md-image-reference svg').attributes('aria-hidden')).toBe('true');
  await reference(wrapper);
  expect(dialog()).toBeNull(); expect(document.body.style.overflow).toBe('');
  expect(wrapper.emitted('reference')).toEqual([[{ src: '/image.png', originalUrl: '/image.png', alt: '海边', title: '日落' }]]);
  await reference(wrapper); expect(wrapper.emitted('reference')).toHaveLength(2);
  await wrapper.get('img').trigger('click');
  expect(dialog()).not.toBeNull(); expect(document.body.style.overflow).toBe('hidden');
  expect(dialog()!.querySelector('.md-image-reference')).toBeNull();
  dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick();
  expect(dialog()).toBeNull(); expect(document.body.style.overflow).toBe('');
});

it('forwards resolved and original URLs through Render and isolates instance events', async () => {
  const one = mount(MarkdownRender, { attachTo: document.body, props: {
    content: '![海边](./image.png "日落")', baseUrl: 'https://example.com/docs/', resolveUrl: url => '/proxy?src=' + encodeURIComponent(url),
  } }); wrappers.push(one);
  const two = mount(MarkdownRender, { attachTo: document.body, props: { content: '![](/other.png)' } }); wrappers.push(two);
  await reference(one);
  expect(one.emitted('image-reference')).toEqual([[{
    src: '/proxy?src=https%3A%2F%2Fexample.com%2Fdocs%2Fimage.png', originalUrl: './image.png', alt: '海边', title: '日落',
  }]]);
  expect(two.emitted('image-reference')).toBeUndefined();
  expect(one.emitted('link-click')).toBeUndefined();
  await reference(two);
  expect(dialog()).toBeNull();
  expect(two.emitted('image-reference')?.[0][0]).toMatchObject({ src: '/other.png', originalUrl: '/other.png' });
  expect(one.emitted('image-reference')).toHaveLength(1);
});

it('forwards an injected MarkdownImage through its own listener and the containing Render', async () => {
  const received = vi.fn<(image: ImageReference) => void>();
  const Card = defineComponent({ setup: () => () => h(MarkdownImage, { src: '/card.png', onReference: received }) });
  const wrapper = mount(MarkdownRender, { attachTo: document.body, props: { content: '<image-card></image-card>', components: { 'image-card': Card } } }); wrappers.push(wrapper);
  await reference(wrapper);
  expect(received).toHaveBeenCalledOnce();
  expect(wrapper.emitted('image-reference')).toEqual([[{ src: '/card.png', originalUrl: '/card.png', alt: undefined, title: undefined }]]);
});

it('references thumbnails with preview disabled, without changing ancestor click behavior', async () => {
  const clicked = vi.fn();
  const Parent = defineComponent({ setup: () => () => h('section', { onClick: clicked }, [h(MarkdownImage, { src: '/plain.png', preview: false })]) });
  const wrapper = mount(Parent); wrappers.push(wrapper);
  await reference(wrapper);
  expect(clicked).not.toHaveBeenCalled();
  expect(dialog()).toBeNull();
  expect(wrapper.findComponent(MarkdownImage).emitted('reference')?.[0][0]).toMatchObject({ src: '/plain.png' });
});

it('supports opt-outs, live options and src changes, and cleans up the standalone overlay on unmount', async () => {
  const wrapper = image({ preview: { reference: false, background: '#123456' }, theme: 'dark' });
  await wrapper.get('img').trigger('click');
  expect(dialog()!.style.background).toBe('#123456');
  expect(wrapper.find('.md-image-reference').exists()).toBe(false);
  await wrapper.setProps({ preview: { reference: true }, originalUrl: 'original-photo' });
  await reference(wrapper);
  expect(wrapper.emitted('reference')?.[0][0]).toMatchObject({ originalUrl: 'original-photo' });
  await wrapper.setProps({ src: '/next.png' }); expect(dialog()).toBeNull();
  await reference(wrapper);
  expect(wrapper.emitted('reference')?.[1][0]).toMatchObject({ src: '/next.png', originalUrl: 'original-photo' });
  await wrapper.setProps({ preview: { enabled: false } }); expect(dialog()).toBeNull();
  await wrapper.get('img').trigger('click'); expect(dialog()).toBeNull();
  await wrapper.setProps({ preview: true }); await wrapper.get('img').trigger('click');
  wrapper.unmount(); expect(dialog()).toBeNull(); expect(document.body.style.overflow).toBe('');
});

it('preserves native linked image navigation, disabled previews, missing URLs and keyboard focus trapping', async () => {
  const wrapper = image({ src: undefined });
  expect(wrapper.get('img').attributes('role')).toBeUndefined();
  expect(wrapper.find('.md-image-reference').exists()).toBe(false);
  await wrapper.setProps({ src: '/image.png', preview: false }); await wrapper.get('img').trigger('click'); expect(dialog()).toBeNull();
  const linked = mount(defineComponent({ setup: () => () => h('a', { href: '/destination' }, [h(MarkdownImage, { src: '/linked.png' })]) })); wrappers.push(linked);
  await linked.get('img').trigger('keydown', { key: 'Enter' }); expect(dialog()).toBeNull();
  expect(linked.find('.md-image-reference').exists()).toBe(false);
  await wrapper.setProps({ preview: true }); await wrapper.get('img').trigger('keydown', { key: ' ' });
  dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })); await nextTick();
  expect(document.activeElement).toBe(dialog());
});
