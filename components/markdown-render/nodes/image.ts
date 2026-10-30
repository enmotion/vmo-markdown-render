import { defineComponent, h, inject, onBeforeUnmount, watch } from 'vue';
import { imagePreviewKey } from '../image-preview/context';

/** 图片默认铺满内容区，宽高比由浏览器按图片原始尺寸保持。 */
export default defineComponent({
  name: 'MarkdownImage',
  inheritAttrs: false,
  props: { src: String, alt: String, title: String, width: String, preview: { type: Boolean, default: true } },
  setup(props) {
    const preview = inject(imagePreviewKey, undefined), owner = Symbol('image');
    function open(event: MouseEvent | KeyboardEvent) {
      if (!props.preview || !preview?.enabled.value || !props.src || (event.currentTarget as HTMLElement).closest('a')) return;
      event.preventDefault(); event.stopPropagation();
      const image = event.currentTarget as HTMLImageElement;
      preview.open({ src: props.src, alt: props.alt, title: props.title,
        ...(image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
          ? { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight } : {}),
      }, owner);
    }
    watch(() => props.src, () => preview?.close(owner));
    onBeforeUnmount(() => preview?.close(owner));
    return () => h('img', {
      src: props.src, alt: props.alt, title: props.title, loading: 'lazy',
      ...(props.preview && preview?.enabled.value && props.src ? { tabindex: 0, role: 'button', 'aria-label': `查看大图：${props.alt || '图片'}`, onClick: open,
        onKeydown: (event: KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') open(event); }, class: 'md-image--preview' } : {}),
      ...(props.width ? { style: { width: props.width, height: 'auto' } } : {}),
    });
  },
});
