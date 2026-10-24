<script setup lang="ts">
import { MarkdownRender } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
const image = new URL('../../src/assets/markdown-image-demo.png', import.meta.url).href;
const content = `标准 Markdown 图片：默认 100% 宽度 / Standard image: full width

![标准图片 / Standard image](${image} "Standard Markdown image")

高级图片指令：60% 宽度 / Advanced image: 60% width

::image[高级图片 / Advanced image]{src="${image}" width="60%" title="Advanced image: 60%"}`;
</script>

<template>
  <MarkdownRender :content="content" theme="auto" style="max-width:600px" />
</template>
