<script setup lang="ts">
import { computed, onBeforeMount, onMounted, onUnmounted, ref } from 'vue';
import type { ImagePreviewOptions } from '../types';
import { activatePreview } from './context';
import { useImageGestures } from './use-image-gestures';

const props = defineProps<{ src: string; alt?: string; title?: string; naturalWidth?: number; naturalHeight?: number; theme: string; background: string; color: string; options: ImagePreviewOptions }>();
const emit = defineEmits<{ (event: 'close'): void }>();
const dialog = ref<HTMLElement>(), stage = ref<HTMLElement>(), previewImage = ref<HTMLImageElement>();
// The source image is normally loaded already; fit the first render without
// waiting for another load event and a second layout of the preview image.
const natural = ref({ x: props.naturalWidth ?? 0, y: props.naturalHeight ?? 0 });
const loaded = ref(natural.value.x > 0 && natural.value.y > 0), failed = ref(false);
const maximum = computed(() => Number.isFinite(props.options.maxScale) ? Math.min(2, Math.max(1, props.options.maxScale!)) : 2);
function close() { emit('close'); }
const { scale, x, y, size, dragging, reset, zoom, wheel, down, move, up, click } = useImageGestures(stage, natural, maximum, close);
function load(event: Event) {
  const image = event.target as HTMLImageElement;
  if (image.naturalWidth > 0 && image.naturalHeight > 0
    && (image.naturalWidth !== natural.value.x || image.naturalHeight !== natural.value.y)) {
    natural.value = { x: image.naturalWidth, y: image.naturalHeight };
  }
  loaded.value = true; failed.value = false;
}
function keyboard(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
  if (event.key === 'Tab') {
    event.preventDefault(); dialog.value?.focus({ preventScroll: true }); return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(scale.value * 1.25); }
  if (event.key === '-') { event.preventDefault(); zoom(scale.value / 1.25); }
  if (event.key === '0') { event.preventDefault(); reset(); }
}
let release: (() => void) | undefined;
// Lock scrolling before the gesture composable measures the stage, so the
// viewport read and focus don't each flush a different document layout.
onBeforeMount(() => { release = activatePreview(close); });
onMounted(() => {
  // Prepare the selected image's full decode before the first pinch. Do not
  // await it: opening, closing and load/error feedback must stay responsive.
  void previewImage.value?.decode?.().catch(() => { /* The image error event handles failures. */ });
  dialog.value?.focus({ preventScroll: true });
});
// Restore scrolling and focus after removing the overlay DOM in the same flush.
onUnmounted(() => { release?.(); });
</script>

<template>
  <Teleport to="body">
    <div ref="dialog" class="md-image-preview" role="dialog" tabindex="-1" aria-modal="true" :aria-label="alt ? `图片预览：${alt}` : '图片预览'" :data-theme="theme"
      :style="{ background, color, colorScheme: theme, '--md-preview-background': background }" @keydown="keyboard">
      <div ref="stage" class="md-image-preview__stage" :class="{ 'is-dragging': dragging }" :data-scale="scale" :data-x="x" :data-y="y"
        @wheel.prevent="wheel" @pointerdown.prevent="down" @pointermove.prevent="move" @pointerup="up" @pointercancel="up" @lostpointercapture="up" @click="click" @contextmenu.prevent>
        <img ref="previewImage" :src="src" :alt="alt" :title="title" class="md-image-preview__image" draggable="false" decoding="async"
          :style="{ width: `${size.x}px`, height: `${size.y}px`, marginLeft: `${-size.x / 2}px`, marginTop: `${-size.y / 2}px`, transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity: loaded && !failed ? 1 : 0 }"
          @load="load" @error="failed = true">
        <p v-if="failed" class="md-image-preview__message" role="alert">图片加载失败，请稍后重试。</p>
        <p v-else-if="!loaded" class="md-image-preview__message" role="status">图片加载中…</p>
      </div>
      <output class="md-image-preview__percentage" aria-label="缩放比例">{{ Math.round(scale * 100) }}%</output>
    </div>
  </Teleport>
</template>

<style>
.md-image-preview { position: fixed; inset: 0; z-index: 2147483000; font: 14px/1.5 system-ui, sans-serif; isolation: isolate; }
.md-image-preview__stage { position: absolute; inset: 0; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: grab; }
.md-image-preview__stage.is-dragging { cursor: grabbing; }
.md-image-preview .md-image-preview__image { position: absolute; left: 50%; top: 50%; display: block; max-width: none; max-height: none; border: 0; border-radius: 0; padding: 0; object-fit: contain; transform-origin: center; pointer-events: auto; -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; }
.md-image-preview__percentage { position: absolute; top: max(16px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); padding: 6px 12px; border-radius: 20px; background: color-mix(in srgb, var(--md-preview-background) 92%, transparent); pointer-events: none; }
.md-image-preview :focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
.md-image-preview__message { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
</style>
