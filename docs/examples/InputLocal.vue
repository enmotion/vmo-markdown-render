<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownInput, type InputValue, type MentionOption, type MentionTrigger } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
const value = ref<InputValue>([]);
const triggers: MentionTrigger[] = [{ character: '@', source: 'member' }, { character: '#', source: 'knowledge' }];
// 数据已经在本地：直接传全集，不需要 search 回调，也没有网络请求。
const options: MentionOption[] = [
  { value: 'user-lin', label: '林见微', source: 'member' },
  { value: 'user-su', label: '苏晚棠', source: 'member' },
  { value: 'kb-product', label: '产品知识库', source: 'knowledge' },
];
</script>

<template>
  <section class="doc-example">
    <p>先输入半角空格再输入 @，或 #；查询名称和 ID，默认不包含拼音搜索。</p>
    <MarkdownInput v-model="value" :mention-triggers="triggers" :options="options" />
    <pre>{{ value }}</pre>
  </section>
</template>
