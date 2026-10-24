<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { MarkdownInput, type InputValue, type MentionOption, type MentionSearch } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
import { requestCandidates } from './mention-http';

const editor = ref<InstanceType<typeof MarkdownInput>>();
const value = ref<InputValue>([]), options = ref<MentionOption[]>([]);
const loading = ref(false), error = ref('');
const lastSearch = ref<MentionSearch>();
let generation = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let controller: AbortController | undefined;
function search(context: MentionSearch) {
  lastSearch.value = context;
  const current = ++generation; // 包含重试；不把组件 requestId 当成全局 HTTP 请求编号。
  clearTimeout(timer); controller?.abort();
  options.value = []; loading.value = true; error.value = '';
  timer = setTimeout(async () => {
    const active = new AbortController(); controller = active;
    try {
      const result = await requestCandidates(context.source, context.query, active.signal);
      if (current === generation) options.value = result;
    } catch {
      if (current === generation && !active.signal.aborted) error.value = '请求失败，请重试';
    } finally {
      if (current === generation) loading.value = false;
    }
  }, 200);
}
onBeforeUnmount(() => { generation++; clearTimeout(timer); controller?.abort(); });
</script>

<template>
  <section class="doc-example">
    <MarkdownInput ref="editor" v-model="value" :mention-triggers="[{ character: '@', source: 'member' }]"
      :options="options" :loading="loading" :filter-option="false" @search="search" />
    <button @pointerdown="editor?.captureSelection()" @click="editor?.openMention('member')">搜索成员</button>
    <button :disabled="!lastSearch || loading" @pointerdown.prevent @click="lastSearch && search(lastSearch)">重试当前查询</button>
    <p role="status">{{ error || (loading ? '正在获取…' : '等待查询') }}</p>
  </section>
</template>
