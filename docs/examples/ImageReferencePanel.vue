<script setup lang="ts">
import { MarkdownImage, MarkdownRender, type ImageReference } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';

defineProps<{ src: string; content: string }>();
const emit = defineEmits<{ (event: 'image-reference', image: ImageReference): void }>();
function forward(image: ImageReference) { emit('image-reference', image); }
</script>

<template>
  <section class="doc-example">
    <p>独立图片 / Standalone image</p>
    <MarkdownImage :src="src" alt="山峰日出 / Mountain sunrise" width="280px" @reference="forward" />
    <p>Render 面板 / Render panel</p>
    <MarkdownRender :content="content" style="max-width: 360px" @image-reference="forward" />
  </section>
</template>
