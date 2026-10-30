<script setup lang="ts">
import { computed, defineComponent, getCurrentInstance, h, onErrorCaptured, provide, ref, shallowRef, toRef, watch } from 'vue';
import type { MarkdownError, MarkdownRenderProps } from './types';
import { createEngine } from '../../use.lib/markdown/engine/parse';
import { renderNodes } from './nodes/render';
import { themeColorStyles } from './theme-colors';
import { useMarkdownTheme } from './composables/theme';
import ImagePreview from './image-preview/image-preview.vue';
import { imagePreviewKey, type PreviewImage } from './image-preview/context';

const props = withDefaults(defineProps<MarkdownRenderProps>(), {
  content: '', streaming: false, theme: '', fontBaseSize: 12, imagePreview: true,
  components: () => ({}), textRules: () => [], unstyled: false,
});
const emit = defineEmits<{
  (event: 'error', error: MarkdownError): void;
  (event: 'headings-change', headings: import('./types').MarkdownHeading[]): void;
  (event: 'link-click', data: { href: string; event: MouseEvent }): void;
}>();
const root = ref<HTMLElement>();
const { theme, effectiveTheme } = useMarkdownTheme(toRef(props, 'theme'), root);
const previewOptions = computed(() => typeof props.imagePreview === 'object' && props.imagePreview ? props.imagePreview : {});
const previewEnabled = computed(() => props.imagePreview !== false && previewOptions.value.enabled !== false);
const selectedImage = shallowRef<(PreviewImage & { owner: symbol })>();
const previewPalette = ref({ background: '#ffffff', color: '#151821' });
function updatePreviewPalette() {
  const dark = effectiveTheme.value === 'dark';
  const computedStyle = root.value ? getComputedStyle(root.value) : undefined;
  const override = previewOptions.value.background;
  const background = typeof override === 'string' ? override : override?.[dark ? 'dark' : 'light'];
  const actual = computedStyle?.backgroundColor;
  previewPalette.value = {
    background: background || (actual && actual !== 'transparent' && actual !== 'rgba(0, 0, 0, 0)' ? actual : computedStyle?.getPropertyValue('--md-background').trim() || computedStyle?.getPropertyValue('--md-default-bg').trim()) || (dark ? '#151821' : '#ffffff'),
    color: computedStyle?.getPropertyValue('--md-text-color').trim() || computedStyle?.getPropertyValue('--md-default-text').trim() || (dark ? '#ffffff' : '#151821'),
  };
}
provide(imagePreviewKey, {
  enabled: previewEnabled,
  open(image, owner) { if (previewEnabled.value) { updatePreviewPalette(); selectedImage.value = { ...image, owner }; } },
  close(owner) { if (selectedImage.value?.owner === owner) selectedImage.value = undefined; },
});
watch(previewEnabled, enabled => { if (!enabled) selectedImage.value = undefined; });
watch([effectiveTheme, () => props.themeColors, previewOptions, root], updatePreviewPalette, { deep: true, flush: 'post' });
const prefix = `md-${getCurrentInstance()!.uid}`;
const engine = computed(() => createEngine(new Set(Object.keys(props.components)), prefix));
const report = (error: MarkdownError) => emit('error', error);
const document = computed(() => {
  try { return engine.value(props.content, props.streaming); }
  catch { report({ stage: 'parse', message: 'Markdown 解析失败，已显示原文' }); return { nodes: [], headings: [] }; }
});
watch(() => document.value.headings, headings => emit('headings-change', headings), { immediate: true });
const style = computed(() => {
  const size = Number.isFinite(props.fontBaseSize) && props.fontBaseSize > 0 ? props.fontBaseSize : 12;
  return { ...themeColorStyles(props.themeColors), '--md-font-base-size': `${size}px`, '--md-diagram-font-scale': size / 12 };
});
const Content = defineComponent({ setup: () => () => document.value.nodes.length
  ? renderNodes(document.value.nodes, { props, theme: effectiveTheme.value, headings: document.value.headings, report })
  : h('span', props.content) });
onErrorCaptured(() => { report({ stage: 'component', message: '业务组件发生错误' }); return false; });
function click(event: MouseEvent) {
  const anchor = (event.target as Element)?.closest?.('a');
  if (anchor) emit('link-click', { href: anchor.getAttribute('href') ?? '', event });
}
</script>

<template>
  <div ref="root" class="markdown-render" :class="{ 'md-styled': !unstyled, dark: theme === 'dark' }" :data-theme="theme || undefined" :style="style" @click="click">
    <div class="markdown-render__content">
      <Content />
    </div>
    <ImagePreview v-if="selectedImage" :key="selectedImage.src" :src="selectedImage.src" :alt="selectedImage.alt" :title="selectedImage.title"
      :natural-width="selectedImage.naturalWidth" :natural-height="selectedImage.naturalHeight"
      :theme="effectiveTheme" :background="previewPalette.background" :color="previewPalette.color" :options="previewOptions" @close="selectedImage = undefined" />
  </div>
</template>
