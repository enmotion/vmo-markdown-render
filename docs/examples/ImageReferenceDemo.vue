<script setup lang="ts">
import { ref } from 'vue';
import type { ImageReference } from 'vmo-markdown-render';
import ImageReferencePanel from './ImageReferencePanel.vue';

const src = new URL('../../src/assets/markdown-image-demo.png', import.meta.url).href;
const content = `![面板中的图片 / Panel image](${src} "Mountain sunrise")`;
const received = ref<ImageReference>();
</script>

<template>
  <section class="doc-example">
    <p>悬停小图后点击左下角双引号图标（引用图片），查看面板外部收到的事件。 / Hover a thumbnail and select the quote icon (引用图片) to inspect the event received outside the panel.</p>
    <ImageReferencePanel :src="src" :content="content" @image-reference="received = $event" />
    <p role="status">{{ received ? '外部已收到引用 / Reference received outside the panel' : '等待引用 / Waiting for a reference' }}</p>
    <pre v-if="received" style="white-space: pre-wrap; overflow-wrap: anywhere">{{ JSON.stringify(received, null, 2) }}</pre>
  </section>
</template>
