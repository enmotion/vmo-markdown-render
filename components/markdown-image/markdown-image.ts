import { computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, ref, toRef, watch, type PropType } from 'vue';
import type { ImagePreviewOptions, ImageReference } from '../markdown-render/types';
import { imagePreviewKey } from '../markdown-render/image-preview/context';
import { useImagePreview } from '../markdown-render/image-preview/use-image-preview';
import { useMarkdownTheme } from '../markdown-render/composables/theme';
import './style.css';

/** Independently usable image with the same lightbox as Render. */
export default defineComponent({
  name: 'MarkdownImage',
  inheritAttrs: false,
  props: {
    src: String, originalUrl: String, alt: String, title: String, width: String,
    reference: { type: Boolean, default: true },
    preview: { type: [Boolean, Object] as PropType<boolean | ImagePreviewOptions>, default: true },
    theme: { type: String as PropType<'' | 'light' | 'dark' | 'auto'>, default: '' },
  },
  emits: { reference: (_image: ImageReference) => true },
  setup(props, { attrs, emit }) {
    const root = ref<HTMLElement>();
    const shared = inject(imagePreviewKey, undefined);
    const theme = shared ? undefined : useMarkdownTheme(toRef(props, 'theme'), root);
    const local = shared ? undefined : useImagePreview(root, toRef(props, 'preview'), theme!.effectiveTheme);
    const preview = shared ?? local!;
    const owner = Symbol('image');
    const enabled = computed(() => props.preview !== false && (typeof props.preview !== 'object' || props.preview.enabled !== false) && preview.enabled.value);
    const referenceEnabled = computed(() => props.reference && !!props.src
      && (typeof props.preview !== 'object' || props.preview.reference !== false)
      && preview.referenceEnabled?.value !== false && !root.value?.closest('a'));
    function reference(event: MouseEvent) {
      event.preventDefault(); event.stopPropagation();
      const data: ImageReference = { src: props.src!, originalUrl: props.originalUrl ?? props.src!, alt: props.alt, title: props.title };
      emit('reference', data);
      preview.reference?.(data);
    }
    function open(event: MouseEvent | KeyboardEvent) {
      if (!enabled.value || !props.src || (event.currentTarget as HTMLElement).closest('a')) return;
      event.preventDefault(); event.stopPropagation();
      const image = event.currentTarget as HTMLImageElement;
      preview.open({ src: props.src, originalUrl: props.originalUrl ?? props.src, alt: props.alt, title: props.title,
        ...(image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
          ? { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight } : {}),
      }, owner);
    }
    watch([() => props.src, enabled], () => preview.close(owner));
    onBeforeUnmount(() => preview.close(owner));
    return () => {
      const image = h('img', mergeProps(attrs, {
        ref: root, src: props.src, alt: props.alt, title: props.title, loading: 'lazy',
        class: [!shared && 'md-image', enabled.value && props.src && 'md-image--preview'],
        ...(enabled.value && props.src ? { tabindex: 0, role: 'button', 'aria-label': `查看大图：${props.alt || '图片'}`, onClick: open,
          onKeydown: (event: KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') open(event); } } : {}),
      }));
      const thumbnail = h('span', { class: 'md-image-container', style: { width: props.width || '100%' } }, [image,
        referenceEnabled.value ? h('button', {
          type: 'button', class: 'md-image-reference', title: '引用图片', 'aria-label': '引用图片', onClick: reference,
        }, [h('svg', { viewBox: '0 0 16 16', width: 12, height: 12, fill: 'currentColor', stroke: 'none',
          'aria-hidden': 'true', focusable: 'false',
        }, [h('path', { d: 'M2 3h5v6l-2 4H2l2-4H2V3Zm7 0h5v6l-2 4H9l2-4H9V3Z' })])]) : null,
      ]);
      return local ? [thumbnail, h(local.Preview)] : thumbnail;
    };
  },
});
