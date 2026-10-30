<script setup lang="ts">
import { computed, nextTick, onBeforeMount, onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue';
import type { ImagePreviewOptions } from '../types';
import { activatePreview } from './context';
import { useImageGestures } from './use-image-gestures';

const props = defineProps<{ src: string; alt?: string; title?: string; naturalWidth?: number; naturalHeight?: number; theme: string; background: string; color: string; options: ImagePreviewOptions }>();
const emit = defineEmits<{ (event: 'close'): void }>();
const dialog = ref<HTMLElement>(), stage = ref<HTMLElement>();
// The source image is normally loaded already; fit the first render without
// waiting for another load event and a second layout of the preview image.
const natural = ref({ x: props.naturalWidth ?? 0, y: props.naturalHeight ?? 0 });
const loaded = ref(natural.value.x > 0 && natural.value.y > 0), failed = ref(false), downloading = ref(false), downloadError = ref('');
const menuPosition = ref<{ x: number; y: number }>();
const maximum = computed(() => Number.isFinite(props.options.maxScale) ? Math.min(32, Math.max(1, props.options.maxScale!)) : 8);
const longPress = computed(() => props.options.longPressDownload !== false);
function close() { emit('close'); }
function menu(point?: { x: number; y: number }) {
  const wasOpen = !!menuPosition.value;
  menuPosition.value = point ? { x: Math.max(12, Math.min(window.innerWidth - 212, point.x)), y: Math.max(12, Math.min(window.innerHeight - 170, point.y)) } : undefined;
  if (wasOpen && !point) void nextTick(() => dialog.value?.focus({ preventScroll: true }));
}
const { scale, x, y, size, dragging, reset, zoom, wheel, down, move, up, click } = useImageGestures(stage, natural, maximum, longPress, close, menu);
function contextmenu(event: MouseEvent) {
  if (dragging.value || ('pointerType' in event && event.pointerType === 'touch')) return;
  menu({ x: event.clientX, y: event.clientY });
}
function load(event: Event) {
  const image = event.target as HTMLImageElement;
  if (image.naturalWidth > 0 && image.naturalHeight > 0
    && (image.naturalWidth !== natural.value.x || image.naturalHeight !== natural.value.y)) {
    natural.value = { x: image.naturalWidth, y: image.naturalHeight };
  }
  loaded.value = true; failed.value = false;
}
let controller: AbortController | undefined;
const objectUrls = new Map<string, ReturnType<typeof setTimeout>>();
async function download() {
  if (downloading.value) return;
  downloading.value = true; downloadError.value = ''; controller = new AbortController();
  try {
    const response = await fetch(props.src, { signal: controller.signal });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    if (controller.signal.aborted) return;
    let filename = new URL(props.src, location.href).pathname.split('/').pop() || 'image';
    try { filename = decodeURIComponent(filename); } catch { /* Preserve malformed escapes as literal filename characters. */ }
    const url = URL.createObjectURL(blob);
    objectUrls.set(url, setTimeout(() => { URL.revokeObjectURL(url); objectUrls.delete(url); }, 1000));
    const anchor = document.createElement('a'); anchor.href = url;
    anchor.download = filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
    document.body.append(anchor); anchor.click(); anchor.remove();
  } catch (error) {
    if (!controller.signal.aborted) downloadError.value = '无法直接下载，请打开原图后保存。';
  } finally { downloading.value = false; }
}
function keyboard(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (menuPosition.value) menu(); else close(); return; }
  if (event.key === 'Tab') {
    const controls = [...dialog.value!.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')];
    if (!controls.length) { event.preventDefault(); dialog.value?.focus(); return; }
    const index = controls.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && index <= 0) { event.preventDefault(); controls.at(-1)?.focus(); }
    else if (!event.shiftKey && (index < 0 || index === controls.length - 1)) { event.preventDefault(); controls[0]?.focus(); }
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
onMounted(() => { dialog.value?.focus({ preventScroll: true }); });
onBeforeUnmount(() => {
  controller?.abort(); objectUrls.forEach((timer, url) => { clearTimeout(timer); URL.revokeObjectURL(url); });
});
// Restore scrolling and focus after removing the overlay DOM in the same flush.
onUnmounted(() => { release?.(); });
</script>

<template>
  <Teleport to="body">
    <div ref="dialog" class="md-image-preview" role="dialog" tabindex="-1" aria-modal="true" :aria-label="alt ? `图片预览：${alt}` : '图片预览'" :data-theme="theme"
      :style="{ background, color, colorScheme: theme, '--md-preview-background': background }" @keydown="keyboard">
      <div ref="stage" class="md-image-preview__stage" :class="{ 'is-dragging': dragging }" :data-scale="scale" :data-x="x" :data-y="y"
        @wheel.prevent="wheel" @pointerdown.prevent="down" @pointermove.prevent="move" @pointerup="up" @pointercancel="up" @lostpointercapture="up" @click="click" @contextmenu.prevent="contextmenu">
        <img :src="src" :alt="alt" :title="title" class="md-image-preview__image" draggable="false"
          :style="{ width: `${size.x}px`, height: `${size.y}px`, marginLeft: `${-size.x / 2}px`, marginTop: `${-size.y / 2}px`, transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity: loaded && !failed ? 1 : 0 }"
          @load="load" @error="failed = true">
        <p v-if="failed" class="md-image-preview__message" role="alert">图片加载失败，请打开原图重试。</p>
        <p v-else-if="!loaded" class="md-image-preview__message" role="status">图片加载中…</p>
      </div>
      <output class="md-image-preview__percentage" aria-label="缩放比例">{{ Math.round(scale * 100) }}%</output>
      <div v-if="menuPosition" class="md-image-preview__menu" role="group" aria-label="图片操作" :style="{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }">
        <button type="button" :disabled="downloading" @click="download">{{ downloading ? '下载中…' : '下载图片' }}</button>
        <a :href="src" target="_blank" rel="noopener noreferrer">打开原图</a>
        <button type="button" @click="menu()">取消</button>
      </div>
      <p v-if="downloadError" class="md-image-preview__download-error" role="alert">{{ downloadError }}</p>
    </div>
  </Teleport>
</template>

<style>
.md-image-preview { position: fixed; inset: 0; z-index: 2147483000; font: 14px/1.5 system-ui, sans-serif; isolation: isolate; }
.md-image-preview__stage { position: absolute; inset: 0; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: grab; }
.md-image-preview__stage.is-dragging { cursor: grabbing; }
.md-image-preview .md-image-preview__image { position: absolute; left: 50%; top: 50%; display: block; max-width: none; max-height: none; border: 0; border-radius: 0; padding: 0; object-fit: contain; transform-origin: center; pointer-events: auto; }
.md-image-preview__percentage { position: absolute; top: max(16px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); padding: 6px 12px; border-radius: 20px; background: color-mix(in srgb, var(--md-preview-background) 92%, transparent); pointer-events: none; }
.md-image-preview button, .md-image-preview a { box-sizing: border-box; display: inline-block; color: inherit; background: transparent; border: 1px solid color-mix(in srgb, currentColor 25%, transparent); border-radius: 6px; padding: 6px 10px; font: inherit; text-decoration: none; cursor: pointer; touch-action: manipulation; }
.md-image-preview button:disabled { opacity: .4; cursor: default; }
.md-image-preview :focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
.md-image-preview__message { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
.md-image-preview__menu { position: absolute; width: 180px; padding: 10px; display: grid; gap: 8px; background: inherit; color: inherit; border: 1px solid currentColor; border-radius: 10px; box-shadow: 0 8px 30px #0003; }
.md-image-preview__download-error { position: absolute; bottom: max(16px, env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%); padding: 8px 12px; background: inherit; max-width: calc(100% - 32px); }
</style>
