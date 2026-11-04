<script setup lang="ts">
import { computed, ref } from 'vue';
import { MarkdownImage, MarkdownRender, type ImagePreviewOptions, type ImageReference } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';

const image = new URL('../../src/assets/markdown-image-demo.png', import.meta.url).href;
const content = `![点击预览 / Open preview](${image} "Preview demo")`;
const enabled = ref(true), maxScale = ref(2);
const theme = ref<'light' | 'dark' | 'auto'>('auto');
const referenced = ref<ImageReference>();
const imagePreview = computed<ImagePreviewOptions>(() => ({
  enabled: enabled.value,
  background: { light: '#f2f4f8', dark: '#151821' },
  maxScale: maxScale.value,
}));
</script>

<template>
  <section class="doc-example">
    <label><input v-model="enabled" type="checkbox">启用预览 / Enable preview</label>
    <label>最大倍率 / Max zoom
      <select v-model.number="maxScale"><option :value="1">1</option><option :value="1.5">1.5</option><option :value="2">2</option></select>
    </label>
    <label>主题 / Theme
      <select v-model="theme"><option value="auto">auto</option><option value="light">light</option><option value="dark">dark</option></select>
    </label>
    <p>点击图片；滚轮或双指缩放，顶部胶囊 X / 空白处 / Esc 关闭。胶囊左侧显示缩放百分比；右键和长按不打开操作菜单。</p>
    <p>Click image; wheel/pinch to zoom; capsule X/backdrop/Esc to close. The capsule percentage is read-only; right-click/touch-hold do not open an action menu.</p>
    <p>悬停小图，点击左下角双引号图标（引用图片）；触屏设备直接显示按钮。 / Hover the thumbnail to reference it from the bottom-left quote icon.</p>
    <p>独立图片 / Standalone image</p>
    <MarkdownImage :src="image" alt="独立图片 / Standalone" :theme="theme" :preview="imagePreview" width="280px" @reference="referenced = $event" />
    <p>Markdown 内置图片 / Image inside Markdown</p>
    <MarkdownRender :content="content" :theme="theme" :image-preview="imagePreview" style="max-width: 420px" @image-reference="referenced = $event" />
    <output v-if="referenced" style="display: block; overflow-wrap: anywhere">引用 / Reference: {{ referenced.src }}</output>
  </section>
</template>
