import { computed, defineComponent, h, provide, ref, shallowRef, watch, type Ref } from 'vue';
import type { ImagePreviewOptions, ImageReference } from '../types';
import ImagePreview from './image-preview.vue';
import { imagePreviewKey, type PreviewImage } from './context';

/** One host per Render, or per standalone image; images within Render share the host. */
export function useImagePreview(
  root: Ref<HTMLElement | undefined>,
  preference: Ref<boolean | ImagePreviewOptions | undefined>,
  theme: Ref<string>,
  onReference?: (image: ImageReference) => void,
) {
  const options = computed(() => typeof preference.value === 'object' && preference.value ? preference.value : {});
  const enabled = computed(() => preference.value !== false && options.value.enabled !== false);
  const referenceEnabled = computed(() => options.value.reference !== false);
  const selected = shallowRef<(PreviewImage & { owner: symbol })>();
  const palette = ref({ background: '#ffffff', color: '#151821' });
  function updatePalette() {
    const dark = theme.value === 'dark';
    const computedStyle = root.value ? getComputedStyle(root.value) : undefined;
    const override = options.value.background;
    const background = typeof override === 'string' ? override : override?.[dark ? 'dark' : 'light'];
    const actual = computedStyle?.backgroundColor;
    palette.value = {
      background: background || (actual && actual !== 'transparent' && actual !== 'rgba(0, 0, 0, 0)' ? actual : computedStyle?.getPropertyValue('--md-background').trim() || computedStyle?.getPropertyValue('--md-default-bg').trim()) || (dark ? '#151821' : '#ffffff'),
      color: computedStyle?.getPropertyValue('--md-text-color').trim() || computedStyle?.getPropertyValue('--md-default-text').trim() || (dark ? '#ffffff' : '#151821'),
    };
  }
  const controller = {
    enabled,
    referenceEnabled,
    reference(image: ImageReference) { onReference?.(image); },
    open(image: PreviewImage, owner: symbol) { if (enabled.value) { updatePalette(); selected.value = { ...image, owner }; } },
    close(owner: symbol) { if (selected.value?.owner === owner) selected.value = undefined; },
  };
  provide(imagePreviewKey, controller);
  watch(enabled, value => { if (!value) selected.value = undefined; });
  watch([theme, preference, root], updatePalette, { deep: true, flush: 'post' });
  const Preview = defineComponent({
    name: 'ImagePreviewHost',
    setup: () => () => selected.value ? h(ImagePreview, {
      key: selected.value.src, src: selected.value.src, alt: selected.value.alt, title: selected.value.title,
      naturalWidth: selected.value.naturalWidth, naturalHeight: selected.value.naturalHeight, theme: theme.value,
      ...palette.value, options: options.value,
      onClose: () => { selected.value = undefined; },
    }) : null,
  });
  return { ...controller, Preview, updatePalette };
}
