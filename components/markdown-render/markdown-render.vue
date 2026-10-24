<script setup lang="ts">
import { computed, defineComponent, getCurrentInstance, h, onErrorCaptured, ref, toRef, watch } from 'vue';
import type { MarkdownError, MarkdownRenderProps } from './types';
import { createEngine } from '../../use.lib/markdown/engine/parse';
import { renderNodes } from './nodes/render';
import { themeColorStyles } from './theme-colors';
import { useMarkdownTheme } from './composables/theme';

const props = withDefaults(defineProps<MarkdownRenderProps>(), {
  content: '', streaming: false, theme: '', fontBaseSize: 12,
  components: () => ({}), textRules: () => [], unstyled: false,
});
const emit = defineEmits<{
  (event: 'error', error: MarkdownError): void;
  (event: 'headings-change', headings: import('./types').MarkdownHeading[]): void;
  (event: 'link-click', data: { href: string; event: MouseEvent }): void;
}>();
const root = ref<HTMLElement>();
const { theme, effectiveTheme } = useMarkdownTheme(toRef(props, 'theme'), root);
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
  </div>
</template>
