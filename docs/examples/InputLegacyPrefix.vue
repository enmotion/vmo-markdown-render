<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownInput, type InputValue, type MentionOption } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';

const value = ref<InputValue>([]);
// 兼容入口不绑定分类，因此候选可以不带 source；新业务推荐 mentionTriggers。
const options: MentionOption[] = [{ value: 'user-lin', label: '林见微' }];
</script>
<template>
  <section class="doc-example">
    <MarkdownInput v-model="value" :prefix="['@', '#']" :options="options" placeholder="先输入半角空格，再输入 @ 或 #" />
    <pre>{{ value }}</pre>
  </section>
</template>
