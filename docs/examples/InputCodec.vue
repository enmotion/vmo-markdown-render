<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownInput, defaultInputCodec, type InputDocument, type InputGetter, type InputSetter,
  type InputValue, type InputCodecError } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';

const initial: InputDocument = { version: 1, nodes: [
  { type: 'mention', content: { label: '林见微', id: 'user-lin', type: 'member', data: { department: '设计' } } },
  { type: 'text', content: ' 请总结。' },
] };
// 特殊持久化需求：保留内部 data，选择自己的字符串协议。不是默认行为。
const getter: InputGetter = document => JSON.stringify(document);
const setter: InputSetter = value => typeof value === 'string' ? JSON.parse(value) as InputDocument : defaultInputCodec.decode(value);
const value = ref<InputValue>(getter(initial));
const editor = ref<InstanceType<typeof MarkdownInput>>();
const saved = ref<InputValue>();
const status = ref('');
function save() { saved.value = editor.value?.getter(); }
function restore() { if (saved.value !== undefined) editor.value?.setter(saved.value); }
function error(event: InputCodecError) { status.value = `${event.stage}: ${event.message}`; }
</script>

<template>
  <section class="doc-example">
    <MarkdownInput ref="editor" v-model="value" :getter="getter" :setter="setter" @error="error" />
    <button @click="save">保存自定义字符串</button><button @click="restore">恢复</button>
    <button @click="editor?.setter('invalid JSON')">测试转换失败</button>
    <p role="status">{{ status }}</p><pre>{{ value }}</pre>
  </section>
</template>
