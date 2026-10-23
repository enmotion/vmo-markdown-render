<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { MarkdownInput, type InputValue, type MentionOption, type MentionSearch } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
import { triggers, shortcuts, requestCandidates } from './input-data';

const editor = ref<InstanceType<typeof MarkdownInput>>();
const value = ref<InputValue>([]);
const options = ref<MentionOption[]>([]);
const loading = ref(false);
const error = ref('');
let latest = 0;
async function search({ source, query }: MentionSearch) {
  const current = ++latest;
  loading.value = true;
  options.value = [];
  error.value = '';
  try {
    const result = await requestCandidates(source, query); // 实际项目替换为你的接口。
    if (current === latest) options.value = result;
  } catch {
    if (current === latest) error.value = '远端搜索失败，请修改关键词重试';
  } finally {
    if (current === latest) loading.value = false;
  }
}
onBeforeUnmount(() => { latest++; });
</script>

<template>
  <section class="doc-example">
    <MarkdownInput ref="editor" v-model="value" :mention-triggers="triggers" :mention-shortcuts="shortcuts"
      :options="options" :loading="loading" :filter-option="false" @search="search" />
    <button @pointerdown="editor?.captureSelection()" @click="editor?.openMention('member')">远端搜索成员</button>
    <p role="status">{{ error || '示例服务支持 ljw / swt；结果不再按 label / value 二次过滤。' }}</p>
    <pre>{{ value }}</pre>
  </section>
</template>
