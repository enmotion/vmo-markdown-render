<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { MarkdownInput, MarkdownRender, defaultInputCodec, type MentionPlacement, type MentionMobilePlacement, type InputI18n, type InputValue, type InputDocument, type InputEnterContext, type MentionOption, type MentionSearch, type MentionShortcut, type ThemeColor } from '../index';
import AttachmentTray, { type LocalAttachment } from './AttachmentTray.vue';
const input = ref<InstanceType<typeof MarkdownInput>>();
const fileInput = ref<HTMLInputElement>();
const plusOpen = ref(false);
const attachments = ref<LocalAttachment[]>([]);
const previews = new Set<string>();
let attachmentId = 0;
function selectFiles(event: Event) {
  for (const file of Array.from((event.target as HTMLInputElement).files ?? [])) {
    const url = /^image\/(png|jpeg|gif|webp|avif|bmp)$/.test(file.type) ? URL.createObjectURL(file) : undefined;
    if (url) previews.add(url);
    attachments.value.push({ id: ++attachmentId, file, url });
  }
  (event.target as HTMLInputElement).value = '';
}
function removeAttachment(id: number) {
  const item = attachments.value.find(file => file.id === id);
  if (item?.url) { URL.revokeObjectURL(item.url); previews.delete(item.url); }
  attachments.value = attachments.value.filter(file => file.id !== id);
}
function dismissPlus(event: PointerEvent) { if (!(event.target instanceof Element) || !event.target.closest('.input-lab__plus')) plusOpen.value = false; }
onMounted(() => document.addEventListener('pointerdown', dismissPlus));
onBeforeUnmount(() => { previews.forEach(url => URL.revokeObjectURL(url)); document.removeEventListener('pointerdown', dismissPlus); });
function openReference(source: string, openMention: (source: string) => void) { plusOpen.value = false; openMention(source); }
const theme = ref<'' | 'light' | 'dark' | 'auto'>('light');
const fontSize = ref(14);
const primary = ref<ThemeColor>('#6366f1');
const transparent = ref(false);
const unstyled = ref(false);
// 演示由宿主管理语言；组件只接受平铺 KV 覆盖。
const english = ref(false);
const placement = ref<MentionPlacement>('auto');
const offset = ref(6);
const mobilePlacement = ref<MentionMobilePlacement>('bottom-sheet');
const englishInputI18n: InputI18n = {
  placeholder: 'Ask anything…',
  mentionCandidates: 'References',
  mentionSearchLabel: 'Search references',
  mentionSearchPlaceholder: 'Search keywords',
  mentionClose: 'Close references',
  mentionHint: 'Search keywords',
  mentionLoading: 'Searching…',
  mentionEmpty: 'No results',
  removeMention: 'Remove {label}',
  getterError: 'Export failed; content preserved with the default conversion',
  setterError: 'Import failed; strings kept as plain text, other invalid input cleared',
};
const disabled = ref(false);
const readonly = ref(false);
const submitOn = ref<'enter' | 'mod-enter' | 'none'>('enter');
const initialDocument: InputDocument = { version: 1, nodes: [
  { type: 'text', content: '请参考 ' },
  { type: 'mention', content: { type: 'knowledge', id: 'kb-product', label: '产品知识库', data: { initials: 'cpzsk' } } },
  { type: 'text', content: '，帮我整理 **重点**、*说明*。\n\n1. 本周更新\n2. 下周计划\n\n- 检查实现\n- 确认交互' },
] };
const draft = ref<InputValue>(defaultInputCodec.encode(initialDocument));
const options = ref<MentionOption[]>([]);
const loading = ref(false);
const remote = ref(false);
let latest = 0;
const modifier = ref<'ctrl' | 'alt' | 'meta'>('ctrl');
const bindings = ref([
  { source: 'knowledge', label: '知识库', key: 'k', character: '#' },
  { source: 'member', label: '成员', key: 'u', character: '@' },
  { source: 'agent', label: '智能体', key: 'j', character: '/' },
]);
const triggers = computed(() => bindings.value.map(({ source, character }) => ({ source, character })));
const shortcuts = computed<MentionShortcut[]>(() => bindings.value.map(binding => ({ source: binding.source, keys: { [modifier.value]: true, key: binding.key }, prefix: '@' })));
const sources: Record<string, MentionOption[]> = {
  knowledge: [
    { value: 'kb-product', label: '产品知识库', data: { initials: 'cpzsk' }, kind: '知识库', source: 'knowledge' },
    { value: 'kb-dev', label: '开发知识库', data: { initials: 'kfzsk' }, kind: '知识库', source: 'knowledge' },
    { value: 'unavailable', label: '归档知识库', data: { initials: 'gdzsk' }, kind: '知识库', source: 'knowledge', disabled: true },
  ],
  member: [{ value: 'user-lin', label: '林见微', data: { initials: 'ljw' }, kind: '成员', source: 'member' }, { value: 'user-su', label: '苏晚棠', data: { initials: 'swt' }, kind: '成员', source: 'member' }],
  agent: [{ value: 'agent-writing', label: '写作助手', data: { initials: 'xzzs' }, kind: '智能体', source: 'agent' }, { value: 'agent-code', label: '代码助手', data: { initials: 'dmzs' }, kind: '智能体', source: 'agent' }],
};
function filter(query: string, option: MentionOption) {
  return [option.label, option.value, String(option.data?.initials ?? '')].some(text => text.toLowerCase().includes(query.toLowerCase()));
}
async function search(context: MentionSearch) {
  const token = ++latest;
  loading.value = remote.value;
  if (remote.value) await new Promise(resolve => setTimeout(resolve, 450));
  if (token !== latest) return;
  const candidates = sources[context.source ?? ''] ?? [];
  options.value = remote.value ? candidates.filter(option => filter(context.query, option)) : candidates;
  loading.value = false;
}
const messages = ref<{ text: string; attachments: LocalAttachment[] }[]>([]);
function send(text: string) { messages.value.push({ text, attachments: [...attachments.value] }); attachments.value = []; draft.value = []; }
function sendCurrent() {
  if (disabled.value || readonly.value || (!draft.value.length && !attachments.value.length)) return;
  send(input.value?.getText() ?? '');
}
function enter(event: KeyboardEvent, context: InputEnterContext) {
  const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? event.metaKey : event.ctrlKey;
  if (submitOn.value !== 'none' && (mod || submitOn.value === 'enter' && !event.shiftKey && !context.inCode && !context.inList)) {
    event.preventDefault(); sendCurrent();
  }
}
watch([disabled, readonly], () => { plusOpen.value = false; });
const exportedText = computed(() => { draft.value; return input.value?.getText() ?? ''; });
const draftDisplay = computed(() => typeof draft.value === 'string' ? draft.value : draft.value.map(node => 'content' in node ? node.content : JSON.stringify(node)).join(''));
const saved = ref<InputValue>();
const saveStatus = ref('');
function save() { saved.value = input.value?.getter() ?? draft.value; localStorage.setItem('vmo-input-nodes-v2', JSON.stringify(saved.value)); saveStatus.value = '草稿已保存'; }
function restore() {
  const stored = localStorage.getItem('vmo-input-nodes-v2');
  let value = saved.value;
  if (value === undefined && stored !== null) {
    try { value = JSON.parse(stored); } catch { saveStatus.value = '草稿格式无效'; return; }
  }
  if (value === null || value === undefined) { saveStatus.value = '还没有保存的草稿'; return; }
  if (input.value) input.value.setter(value);
  else draft.value = value;
  saveStatus.value = '草稿已恢复';
}
</script>

<template>
  <section class="input-lab">
    <header><small>VMO / COMPOSER</small><h2>聊天输入工作台</h2><p>空格后输入 @ 成员、# 知识库、/ 智能体，或使用组合键。支持拼音首字母过滤。文本支持实时排版，列表 Enter 自动续项，Shift+Enter 普通换行。</p></header>
    <div class="input-lab__controls">
      <label>主题 <select v-model="theme"><option>light</option><option>dark</option><option>auto</option><option value="">跟随宿主</option></select></label>
      <label>字号 <input v-model.number="fontSize" type="range" min="10" max="24"> {{ fontSize }}px</label>
      <label>主色 <input v-model="primary" type="color"></label>
      <label>发送 <select v-model="submitOn"><option value="enter">Enter</option><option value="mod-enter">Cmd / Ctrl + Enter</option><option value="none">仅按钮</option></select></label>
      <label><input v-model="transparent" type="checkbox">透明背景</label>
      <label><input v-model="remote" type="checkbox">模拟远程搜索</label>
      <label><input v-model="unstyled" type="checkbox">unstyled</label>
      <label><input v-model="disabled" type="checkbox">禁用</label>
      <label><input v-model="readonly" type="checkbox">只读</label>
      <label><input v-model="english" type="checkbox">英文输入文案</label>
      <label>浮窗方向 <select v-model="placement" aria-label="浮窗方向"><option value="auto">自动</option><option value="top">优先上方</option><option value="bottom">优先下方</option></select></label>
      <label>浮窗间距 <input v-model.number="offset" type="number" aria-label="浮窗间距" min="0" max="48" style="width:4em"> px</label>
      <label>移动浮窗 <select v-model="mobilePlacement" aria-label="移动浮窗"><option value="bottom-sheet">底部向上展开</option><option value="caret">跟随光标</option></select></label>
    </div>
    <div class="input-lab__controls" aria-label="Mention 快捷键设置">
      <label>修饰键 <select v-model="modifier" aria-label="修饰键"><option value="ctrl">Control</option><option value="alt">Alt / Option</option><option value="meta">Command / Meta</option></select></label>
      <label v-for="binding in bindings" :key="binding.source">{{ binding.label }} <input v-model="binding.key" :aria-label="`${binding.label}快捷字符`" maxlength="1" size="2"></label>
      <small>按修饰键 + 对应字符唤起，仅展示该分类。</small>
    </div>
    <div class="input-lab__grid">
      <div class="input-lab__chat">
        <AttachmentTray :files="attachments" :removable="!disabled && !readonly" @remove="removeAttachment" />
        <input ref="fileInput" type="file" multiple hidden aria-label="选择附件" @change="selectFiles">
        <div class="input-lab__messages" aria-live="polite">
          <p v-if="!messages.length" class="input-lab__empty">你的下一条消息，从这里开始。</p>
          <article v-for="(message, index) in messages" :key="index"><small>你 · 消息</small><AttachmentTray :files="message.attachments" /><MarkdownRender :content="message.text" :theme="theme" :font-base-size="fontSize" :theme-colors="{ primary }" /></article>
        </div>
        <MarkdownInput ref="input" v-model="draft" :i18n="english ? englishInputI18n : undefined" :placement="placement" :offset="offset" :mobile-placement="mobilePlacement" :mention-shortcuts="shortcuts" :mention-triggers="triggers" :options="options" :loading="loading" :filter-option="remote ? false : filter" :theme="theme" :font-base-size="fontSize" :theme-colors="{ primary, darkBackground:'#000000' }" :style="transparent ? { '--md-background': 'transparent' } : {}" :unstyled="unstyled" :disabled="disabled" :readonly="readonly" @search="search" @enter="enter" />
        <div class="input-lab__toolbar" :data-theme="theme" :style="{ '--demo-primary': primary }">

            <div class="input-lab__plus">
              <button type="button" aria-label="添加引用或附件" :aria-expanded="plusOpen" :disabled="disabled || readonly" @pointerdown="input?.captureSelection()" @click="plusOpen = !plusOpen" @keydown.esc="plusOpen = false">＋</button>
              <div v-if="plusOpen" class="input-lab__plus-menu" role="menu" aria-label="添加内容">
                <button v-for="binding in bindings" :key="binding.source" type="button" role="menuitem" @click="openReference(binding.source, source => input?.openMention(source))">引用{{ binding.label }} <small>{{ modifier }} + {{ binding.key }}</small></button>
                <button type="button" role="menuitem" @click="plusOpen = false; fileInput?.click()">添加附件</button>
                <button type="button" role="menuitem" @click="plusOpen = false">关闭</button>
              </div>
            </div>
          <div class="input-lab__actions">
            <span>{{ submitOn === 'enter' ? 'Enter 发送 · Shift+Enter 换行' : 'Enter 换行' }}</span>
            <button :disabled="(!draft.length && !attachments.length) || disabled || readonly" @click="sendCurrent">发送 ↗</button>
          </div>
        </div>
        <div class="input-lab__draft-actions"><button @click="save">保存草稿</button><button @click="restore">恢复草稿</button><button @click="draft = []">清空</button><small role="status">{{ saveStatus }}</small></div>
      </div>
      <aside class="input-lab__inspect"><h3>发送文字</h3><pre>{{ exportedText || '（空）' }}</pre><h3>节点数组（v-model）</h3><pre data-testid="draft-json">{{ draftDisplay }}</pre><pre data-testid="node-output">{{ draft }}</pre></aside>
    </div>
  </section>
</template>

<style>
.input-lab { margin-bottom: 3rem; }
.input-lab header small { color: #6265a0; letter-spacing: .16em; font-weight: 700; }
.input-lab header h2 { margin: .4rem 0; font-size: 1.8rem; }
.input-lab header p, .input-lab__empty { color: #6c7488; }
.input-lab__controls { display: flex; flex-wrap: wrap; align-items: center; gap: .8rem 1.2rem; margin: 1.5rem 0; font-size: .85rem; }
.input-lab__controls label { display: flex; align-items: center; gap: .35rem; }
.input-lab select, .input-lab__draft-actions button { border: 1px solid #d2d7e4; border-radius: .4rem; background: white; padding: .4rem; }
.input-lab__grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 1.5rem; }
.input-lab__chat { min-width: 0; }
.input-lab__messages { min-height: 10rem; max-height: 24rem; overflow: auto; padding: 1rem; margin-bottom: 1rem; border-radius: .8rem; background: #e5e8f0; }
.input-lab__messages article { margin-bottom: 1rem; }
.input-lab__messages article > small { color: #6c7488; }
.input-lab__messages .markdown-render { padding: .7em 1em; border-radius: .5em; }
.input-lab .input-lab__actions span { color: var(--md-muted-color, var(--md-default-muted)); font-size: .8em; }
.input-lab .input-lab__toolbar button { background: var(--demo-primary, #6366f1); color: white; font: inherit; border: 0; border-radius: .5em; padding: .4em 1em; cursor: pointer; }
.input-lab__plus { position: relative; }
.input-lab__plus-menu { position: absolute; z-index: 60; bottom: calc(100% + .6rem); left: 0; width: 15rem; background: var(--demo-bg, white); border: 1px solid var(--demo-border, #d2d7e4); border-radius: .6rem; padding: .4rem; }
.input-lab .input-lab__plus-menu button { display: flex; justify-content: space-between; gap: .6em; width: 100%; text-align: left; background: transparent; color: inherit; padding: .6em; }
.input-lab .input-lab__plus-menu button:hover { background: var(--demo-hover, #edf0f6); }
.input-lab__plus-menu small { font-size: .7em; }
.input-lab .input-lab__toolbar button:disabled { opacity: .4; cursor: default; }
.input-lab__draft-actions { display: flex; gap: .6rem; align-items: center; margin-top: .75rem; }
.input-lab__inspect { background: #f8f9fc; border: 1px solid #dce0e9; border-radius: .8rem; padding: 1rem; min-width: 0; }
.input-lab__inspect h3 { font-size: .85rem; color: #6c7488; }
.input-lab__inspect pre { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 25rem; overflow: auto; font: .8rem/1.6 ui-monospace, monospace; }
@media(max-width:800px) { .input-lab__grid { grid-template-columns: 1fr; } }
</style>

<style>
.input-lab__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1em; padding: .7rem 1rem; border: 1px solid #d2d7e4; border-radius: .6rem; background: var(--demo-bg, white); color: var(--demo-text, #253047); margin-top: .5rem; }
.input-lab__actions { display: flex; align-items: center; gap: 1em; }
</style>

<style>
.input-lab__toolbar[data-theme='dark'] { --demo-bg: #151821; --demo-text: #e5e7ef; --demo-border: #363e50; --demo-hover: #252936; }
@media(prefers-color-scheme: dark) { .input-lab__toolbar[data-theme='auto'] { --demo-bg: #151821; --demo-text: #e5e7ef; --demo-border: #363e50; --demo-hover: #252936; } }
</style>
