<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownInput, type InputValue, type MentionOption, type MentionSearch } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
import { triggers, shortcuts, optionsFor, matchInitials } from './input-data';

const editor = ref<InstanceType<typeof MarkdownInput>>();
const value = ref<InputValue>([]);
const options = ref<MentionOption[]>([]);
const initials = ref(false);
function search({ source }: MentionSearch) {
  options.value = optionsFor(source); // 同步提供当前分类全集；组件使用 query 继续过滤。
}
</script>

<template>
  <section class="doc-example">
    <label><input v-model="initials" type="checkbox">自定义首字母过滤（如 ljw）</label>
    <MarkdownInput ref="editor" v-model="value" :mention-triggers="triggers" :mention-shortcuts="shortcuts"
      :options="options" :filter-option="initials ? matchInitials : undefined" @search="search" />
    <button @pointerdown="editor?.captureSelection()" @click="editor?.openMention('member')">选择成员</button>
    <pre>{{ value }}</pre>
  </section>
</template>
