<script setup lang="ts">
import { computed, ref } from 'vue';
import { MarkdownRender, type ImagePreviewOptions } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';

const image = new URL('../../src/assets/markdown-image-demo.png', import.meta.url).href;
const content = `![点击预览 / Open preview](${image} "Preview demo")`;
const enabled = ref(true), longPressDownload = ref(true), maxScale = ref(8);
const theme = ref<'light' | 'dark' | 'auto'>('auto');
const imagePreview = computed<ImagePreviewOptions>(() => ({
  enabled: enabled.value,
  background: { light: '#f2f4f8', dark: '#151821' },
  maxScale: maxScale.value,
  longPressDownload: longPressDownload.value,
}));
</script>

<template>
  <section class="doc-example">
    <label><input v-model="enabled" type="checkbox">启用预览 / Enable preview</label>
    <label><input v-model="longPressDownload" type="checkbox">触屏长按菜单 / Touch hold menu</label>
    <label>最大倍率 / Max zoom
      <select v-model.number="maxScale"><option :value="1">1</option><option :value="4">4</option><option :value="8">8</option></select>
    </label>
    <label>主题 / Theme
      <select v-model="theme"><option value="auto">auto</option><option value="light">light</option><option value="dark">dark</option></select>
    </label>
    <p>点击图片；滚轮或双指缩放，空白处 / Esc 关闭。右键或触屏长按打开菜单。</p>
    <p>Click image; wheel/pinch to zoom; backdrop/Esc to close. Right-click or touch-hold for actions.</p>
    <MarkdownRender :content="content" :theme="theme" :image-preview="imagePreview" style="max-width: 420px" />
  </section>
</template>
