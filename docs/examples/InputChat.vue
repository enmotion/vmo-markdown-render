<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownInput, type InputValue, type InputEnterContext, type InputCodecError, type InputMentionNode,
  type MentionOption, type MentionSearch } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
import { triggers, shortcuts, optionsFor } from './input-data';

const editor = ref<InstanceType<typeof MarkdownInput>>();
const value = ref<InputValue>([]);
const options = ref<MentionOption[]>([]);
const messages = ref<string[]>([]);
const status = ref('');
const sendOn = ref<'button' | 'mod-enter' | 'enter'>('mod-enter');
let saved: InputValue | undefined;
function search({ source }: MentionSearch) { options.value = optionsFor(source); }
function send() {
  const text = editor.value?.getText() ?? '';
  if (!text.trim()) return;
  messages.value.push(text); // 在这里调用宿主的聊天 API；本例只展示结果。
  editor.value?.setter([]); // 成功后由宿主决定何时清空。
}
function enter(event: KeyboardEvent, context: InputEnterContext) {
  const mod = event.ctrlKey || event.metaKey;
  if (sendOn.value === 'mod-enter' && mod || sendOn.value === 'enter' && !event.shiftKey && !context.inList) {
    event.preventDefault();
    send();
  }
}
function save() { saved = editor.value?.getter(); status.value = '已保存节点数组到内存'; }
function restore() { if (saved !== undefined) editor.value?.setter(saved); }
function selected(option: MentionOption, context: MentionSearch) { status.value = `选择 ${context.source}: ${option.value}`; }
function removed(node: InputMentionNode) { status.value = `删除 ${node.content.label}`; }
function changed(next: InputValue) { status.value = `内容更新：${Array.isArray(next) ? next.length : 1} 段`; }
function failed(error: InputCodecError) { status.value = `${error.stage}: ${error.message}`; }
function focused(event: FocusEvent) { status.value = `输入区 ${event.type}`; }
</script>

<template>
  <section class="doc-example">
    <label>发送方式 <select v-model="sendOn"><option value="button">仅按钮</option><option value="mod-enter">Ctrl / Cmd + Enter</option><option value="enter">Enter（列表中仍换行）</option></select></label>
    <MarkdownInput ref="editor" v-model="value" :mention-triggers="triggers" :mention-shortcuts="shortcuts" :options="options"
      @update:model-value="changed" @search="search" @enter="enter" @select="selected" @mention-remove="removed"
      @error="failed" @focus="focused" @blur="focused">
      <template #mention-header="{ search: current }"><small>{{ current.source }} · {{ current.query || '全部候选' }}</small></template>
      <template #label="{ option, query, prefix, source }"><span>{{ option.label }}</span><small>{{ source }} / {{ prefix }}{{ query }}</small></template>
      <template #loading>正在向服务端获取候选…</template>
      <template #empty>没有匹配结果</template>
      <template #mention-footer="{ search: current }"><small>请求编号 {{ current.requestId }}；Enter 选择，Esc 关闭</small></template>
    </MarkdownInput>
    <div class="doc-actions">
      <button @pointerdown="editor?.captureSelection()" @click="editor?.openMention('member')">＋ 成员</button>
      <button @click="send">发送</button><button @click="save">保存</button><button @click="restore">恢复</button>
      <button @click="editor?.focus()">聚焦末尾</button><button @click="editor?.blur()">失焦</button>
      <button @pointerdown.prevent @click="editor?.insertText('补充文字')">插入文字</button>
    </div>
    <p role="status">{{ status }}</p>
    <pre v-for="(message, index) in messages" :key="index">{{ message }}</pre>
  </section>
</template>
