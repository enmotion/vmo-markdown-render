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
// 按分类缓存全集的 Promise，查询词变化不重复请求；缓存失败可重试。
const cache = new Map<string | undefined, Promise<MentionOption[]>>();
let latest = 0;
async function search({ source }: MentionSearch) {
  const current = ++latest;
  loading.value = true;
  error.value = '';
  options.value = [];
  let task = cache.get(source);
  if (!task) {
    task = requestCandidates(source); // 不传 query：取回分类全集。
    cache.set(source, task);
    const failedTask = task;
    void task.catch(() => { if (cache.get(source) === failedTask) cache.delete(source); });
  }
  try {
    const result = await task;
    if (current === latest) options.value = result;
  } catch {
    if (current === latest) error.value = '获取候选失败，请重新打开重试';
  } finally {
    if (current === latest) loading.value = false;
  }
}
onBeforeUnmount(() => { latest++; });
</script>

<template>
  <section class="doc-example">
    <MarkdownInput ref="editor" v-model="value" :mention-triggers="triggers" :mention-shortcuts="shortcuts"
      :options="options" :loading="loading" @search="search" />
    <button @pointerdown="editor?.captureSelection()" @click="editor?.openMention('member')">异步获取成员</button>
    <p role="status">{{ error || '分类全集获取后，按 label / value 本地过滤。' }}</p>
    <pre>{{ value }}</pre>
  </section>
</template>
