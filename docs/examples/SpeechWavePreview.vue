<script setup lang="ts">
import { ref } from 'vue';
import { SpeechWave } from 'vmo-markdown-render';
const active = ref(false);
const level = ref(.7);
const speed = ref(1);
const intensity = ref(1.5);
const first = ref('#6366f1');
const last = ref('#06b6d4');
</script>

<template>
  <section class="doc-example">
    <label><input v-model="active" type="checkbox">播放波纹动效</label>
    <label>演示强度 <input v-model.number="level" type="range" min="0" max="1" step="0.05"></label>
    <label>动效速度 {{ speed }} <input v-model.number="speed" type="range" min="0" max="5" step="0.1"></label>
    <label>波纹强度 {{ intensity }} <input v-model.number="intensity" type="range" min="0" max="3" step="0.1"></label>
    <label>起始色 <input v-model="first" type="color"></label>
    <label>结束色 <input v-model="last" type="color"></label>
    <SpeechWave :active="active" :level="level" :speed="speed" :intensity="intensity" :colors="[first, last]" :height="80" />
    <small>这是独立的 Canvas 动效预览，不请求麦克风权限。</small>
  </section>
</template>
