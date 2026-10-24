<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownInput, type InputValue, type MentionOption, type MentionSearch, type MentionTrigger,
  type MentionShortcut, type InputEnterContext, type InputMentionNode, type InputCodecError } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';

const editor = ref<InstanceType<typeof MarkdownInput>>();
const value = ref<InputValue>([]);
const sendMode = ref<'button' | 'mod-enter' | 'enter'>('mod-enter');
const options: MentionOption[] = [
  { value: 'user-lin', label: '林见微', source: 'member', data: { initials: 'ljw' } },
  { value: 'kb-product', label: '产品知识库', source: 'knowledge' },
];
const triggers: MentionTrigger[] = [{ character: '@', source: 'member' }, { character: '#', source: 'knowledge' }];
const shortcuts: MentionShortcut[] = [
  { source: 'member', keys: { ctrl: true, key: 'u' }, prefix: '@' },
  { source: 'knowledge', keys: { ctrl: true, shift: true, key: 'k' }, prefix: '#' },
];
const events = ref<{ name: string; args: unknown[] }[]>([]);
const sent = ref<{ text: string; value: InputValue }[]>([]);
function log(name: string, ...args: unknown[]) { events.value = [{ name, args }, ...events.value].slice(0, 16); }
function search(context: MentionSearch) { log('search', context); } // 本例已有本地全集，无需重新赋 options。
function selected(option: MentionOption, context: MentionSearch) { log('select', option, context); }
function removed(node: InputMentionNode) { log('mention-remove', node); }
function updated(next: InputValue) { log('update:modelValue', next); }
function failed(error: InputCodecError) { log('error', error); }
function focus(event: FocusEvent) { log(event.type, { type: event.type }); }
function send() {
  const text = editor.value?.getText() ?? '';
  if (!text.trim()) return;
  sent.value.push({ text, value: editor.value!.getter() });
  log('host-send', { text }); // 这是宿主日志，不是组件发出的 send 事件。
  editor.value?.setter([]); // 演示本地发送；真实业务应 await 接口成功后再按需清空。
}
function enter(event: KeyboardEvent, context: InputEnterContext) {
  const plain = !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
  const mod = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
  const shouldSend = sendMode.value === 'mod-enter' ? mod : sendMode.value === 'enter' && plain && !context.inList;
  if (shouldSend) event.preventDefault(); // 必须同步取消默认换行，不能等网络 await 之后。
  log('enter', { key: event.key, ctrlKey: event.ctrlKey, metaKey: event.metaKey,
    altKey: event.altKey, shiftKey: event.shiftKey, defaultPrevented: event.defaultPrevented }, context);
  if (shouldSend) send();
}
</script>

<template>
  <section class="doc-example">
    <p>空格后输入 @ / #；Ctrl+U / Ctrl+Shift+K 打开引用。查询词只在候选框中。下方显示真实事件参数。</p>
    <label>发送热键 <select v-model="sendMode" aria-label="发送热键">
      <option value="button">仅按钮</option><option value="mod-enter">Ctrl/Cmd+Enter</option>
      <option value="enter">Enter（列表内保留换行）</option>
    </select></label>
    <MarkdownInput ref="editor" v-model="value" :options="options" :mention-triggers="triggers" :mention-shortcuts="shortcuts"
      @search="search" @select="selected" @update:model-value="updated" @mention-remove="removed"
      @enter="enter" @error="failed" @focus="focus" @blur="focus" />
    <button @pointerdown="editor?.captureSelection()" @click="editor?.openMention('member')">打开成员引用</button>
    <button @click="send">发送</button>
    <p>当前 v-model（数据数组）</p><pre data-testid="example-model">{{ value }}</pre>
    <p>已发送 text 与 getter 快照（两种不同格式）</p><pre data-testid="example-sent">{{ sent }}</pre>
    <p>事件记录：args 中每项对应一个回调参数，最新在前</p><pre data-testid="example-events">{{ events }}</pre>
  </section>
</template>
