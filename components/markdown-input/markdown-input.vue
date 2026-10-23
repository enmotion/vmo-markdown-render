<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, ref, toRef, watch } from 'vue';
import type { InputCodecError, InputEnterContext, InputMentionNode, MarkdownInputProps, MentionOption, MentionSearch } from './types';
import { useKeyboardInset } from './use-keyboard-inset';
import { matchMentionTrigger } from './triggers';
import { matchMentionShortcut } from './shortcuts';
import { codeContext } from './code-context';
import { documentLength, exportInput, sliceDocument } from './document';
import { useInputEditor } from './use-editor';
import { useMarkdownTheme } from '../markdown-render/composables/theme';
import { themeColorStyles } from '../markdown-render/theme-colors';
import { getSelectionOffsets, setSelectionOffsets } from './dom';

const props = withDefaults(defineProps<MarkdownInputProps>(), {
  prefix: () => [], mentionTriggers: () => [], mentionShortcuts: () => [], options: () => [], loading: false, placeholder: '输入消息…',
  disabled: false, readonly: false, theme: '', fontBaseSize: 12, unstyled: false,
});
const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'search', value: MentionSearch): void;
  (event: 'select', option: MentionOption, context: MentionSearch): void;
  (event: 'mention-remove', node: InputMentionNode): void;
  (event: 'enter', value: KeyboardEvent, context: InputEnterContext): void;
  (event: 'error', value: InputCodecError): void;
  (event: 'focus', value: FocusEvent): void;
  (event: 'blur', value: FocusEvent): void;
}>();
const root = ref<HTMLElement>();
const editor = ref<HTMLElement>();
const { theme } = useMarkdownTheme(toRef(props, 'theme'), root);
const { inset, height: viewportHeight } = useKeyboardInset();
const state = useInputEditor(props, editor, emit);
const { composing } = state;
const menuId = `md-mention-${getCurrentInstance()!.uid}`;
const active = ref(0);
const search = ref<(MentionSearch & { start: number; end: number })>();
const panelQuery = ref(false);
let queryComposing = false;
const queryInput = ref<HTMLInputElement>();
let bookmark: [number, number] | undefined;
const menuStyle = ref<Record<string, string>>({});
let requestId = 0;
const options = computed(() => props.options.filter(option => {
  if (search.value?.source && option.source !== search.value.source) return false;
  if (!search.value || props.filterOption === false) return true;
  if (props.filterOption) return props.filterOption(search.value.query, option, search.value.prefix);
  const query = search.value.query.toLocaleLowerCase();
  return option.label.toLocaleLowerCase().includes(query) || option.value.toLocaleLowerCase().includes(query);
}));
const style = computed(() => ({ '--md-keyboard-inset': `${inset.value}px`, '--md-panel-max-height': viewportHeight.value ? `${viewportHeight.value * .65}px` : '45dvh', ...themeColorStyles(props.themeColors), '--md-font-base-size': `${Number.isFinite(props.fontBaseSize) && props.fontBaseSize > 0 ? props.fontBaseSize : 12}px` }));
const isEmpty = computed(() => documentLength(state.doc.value) === 0);
function close() { search.value = undefined; panelQuery.value = false; queryComposing = false; }
function cancelSearch() {
  const end = search.value?.end;
  close();
  if (end !== undefined && editor.value) {
    editor.value.focus(); setSelectionOffsets(editor.value, end); captureSelection();
  }
}
function startSearch(source: string | undefined, prefix: string, start: number, end: number) {
  panelQuery.value = true;
  search.value = { source, prefix, query: '', start, end, requestId: ++requestId };
  announce(); nextTick(() => queryInput.value?.focus());
}
function captureSelection() {
  const current = editor.value && getSelectionOffsets(editor.value);
  if (current) bookmark = current;
}
function openMention(source: string) {
  if (props.disabled || props.readonly || composing.value) return;
  const binding = props.mentionShortcuts.find(item => item.source === source)
    ?? props.mentionTriggers.find(item => item.source === source);
  if (!binding || !editor.value) return;
  const selection = bookmark ?? state.selection();
  editor.value.focus(); setSelectionOffsets(editor.value, ...selection);
  const context = codeContext(exportInput(sliceDocument(state.doc.value, 0, selection[0]), () => '\ufffc').text);
  if (context.fenced || context.inline) return;
  startSearch(source, 'character' in binding ? binding.character : binding.prefix ?? '@', ...selection);
}
function setPanelQuery(query: string) {
  if (!search.value || queryComposing || search.value.query === query) return;
  if (/[ \r\n]/.test(query)) { cancelSearch(); return; }
  search.value = { ...search.value, query, requestId: ++requestId }; announce();
}
function panelBlur(event: FocusEvent) {
  if (!(event.relatedTarget instanceof Node) || !root.value?.contains(event.relatedTarget)) close();
}
function blur(event: FocusEvent) {
  captureSelection();
  if (!(event.relatedTarget instanceof Node) || !root.value?.contains(event.relatedTarget)) close();
  emit('blur', event);
}
function positionMenu() {
  nextTick(() => {
    const selection = window.getSelection();
    const rect = selection?.rangeCount ? selection.getRangeAt(0).getBoundingClientRect() : undefined;
    const outer = root.value?.getBoundingClientRect();
    if (rect && outer) menuStyle.value = { left: `${Math.max(0, Math.min(rect.left - outer.left, outer.width - Math.min(300, outer.width)))}px`, top: `${Math.max(36, rect.bottom - outer.top + 6)}px` };
  });
}
function announce() {
  const context = search.value;
  if (!context) return;
  active.value = 0;
  emit('search', { prefix: context.prefix, query: context.query, source: context.source, requestId: context.requestId });
  positionMenu();
}
function beforeInput(event: InputEvent) {
  if (props.disabled || props.readonly || composing.value || event.isComposing) { state.beforeInput(event); return; }
  const data = event.inputType === 'insertText' ? event.data : null;
  const prefixes = typeof props.prefix === 'string' ? [props.prefix] : props.prefix;
  const [start, end] = state.selection();
  const before = exportInput(sliceDocument(state.doc.value, 0, start), () => '\ufffc').text;
  const trigger = start === end ? matchMentionTrigger(data, before, props.mentionTriggers, prefixes) : undefined;
  state.beforeInput(event);
  if (trigger) startSearch(trigger.source, trigger.character, start, start + trigger.character.length);
}
function queryInputEvent(event: Event) {
  setPanelQuery((event.target as HTMLInputElement).value);
}
function queryBeforeInput(event: InputEvent) {
  if (!queryComposing && !event.isComposing && (event.data?.includes(' ') || ['insertParagraph', 'insertLineBreak'].includes(event.inputType))) {
    event.preventDefault(); cancelSearch();
  }
}
function editorClick() { captureSelection(); close(); }
function choose(option: MentionOption) {
  const context = search.value;
  if (context?.source && option.source !== context.source) return;
  if (!context || option.disabled || props.loading || props.disabled || props.readonly) return;
  const mention: InputMentionNode = { type: 'mention', prefix: context.prefix, source: context.source, id: option.value, label: option.label, kind: option.kind, data: option.data };
  state.replace(context.start, context.end, { version: 1, nodes: [mention, { type: 'text', text: ' ' }] });
  close(); emit('select', option, { prefix: context.prefix, query: context.query, source: context.source, requestId: context.requestId });
}
function newline() {
  const [start] = state.selection();
  const before = exportInput(sliceDocument(state.doc.value, 0, start), () => '\ufffc').text;
  const line = before.slice(before.lastIndexOf('\n') + 1);
  const { fenced } = codeContext(before);
  const list = !fenced && /^(\s*)([-+*]|\d+\.)(\s+)(.*)$/.exec(line);
  if (list && !list[4]) { state.replace(start - line.length, start, { version: 1, nodes: [{ type: 'text', text: '\n' }] }); return; }
  const marker = list ? /^\d/.test(list[2]) ? `${parseInt(list[2]) + 1}.` : list[2] : '';
  state.insertText('\n' + (list ? list[1] + marker + list[3] : ''));
}
function keydown(event: KeyboardEvent) {
  if (event.isComposing || queryComposing || composing.value || event.keyCode === 229 || props.disabled || props.readonly) return;
  const shortcut = matchMentionShortcut(event, props.mentionShortcuts);
  if (shortcut) {
    const [start, end] = event.target === queryInput.value && search.value
      ? [search.value.start, search.value.end] : state.selection();
    const code = codeContext(exportInput(sliceDocument(state.doc.value, 0, start), () => '\ufffc').text);
    if ((start !== end && event.target !== queryInput.value) || code.fenced || code.inline) return;
    event.preventDefault(); event.stopPropagation();
    startSearch(shortcut.source, shortcut.prefix ?? '@', start, end); return;
  }
  const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? event.metaKey : event.ctrlKey;
  if (event.target !== queryInput.value && mod && ['z', 'y'].includes(event.key.toLowerCase())) { event.preventDefault(); state.undo(event.shiftKey || event.key.toLowerCase() === 'y'); close(); return; }
  if (search.value) {
    if (event.key === 'Escape' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); cancelSearch(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); const enabled = options.value.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
      const index = enabled.indexOf(active.value);
      active.value = enabled[(index + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length] ?? -1;
      nextTick(() => root.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })); return;
    }
    if (event.key === 'Enter') { event.preventDefault(); const option = options.value[active.value]; if (option) choose(option); return; }
  }
  if (event.target === queryInput.value) return;
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'].includes(event.key)) close();
  if (event.key !== 'Enter') return;
  const before = exportInput(sliceDocument(state.doc.value, 0, state.selection()[0]), () => '\ufffc').text;
  emit('enter', event, { inCode: codeContext(before).fenced });
  if (event.defaultPrevented) return;
  event.preventDefault();
  if (event.shiftKey) state.insertText('\n');
  else newline();
}
function focus() { editor.value?.focus(); }
function insertText(text: string) { focus(); state.insertText(text); }
function focusEnd() { focus(); if (editor.value) setSelectionOffsets(editor.value, documentLength(state.doc.value)); }
watch(state.externalRevision, () => { bookmark = undefined; close(); });
// 父组件常使用数组字面量；只在触发符内容变化时重新查询，避免结果回写触发搜索循环。
watch(() => JSON.stringify([props.prefix, props.mentionTriggers]), close);
watch(() => JSON.stringify(props.mentionShortcuts), close);
watch(composing, value => { if (value) close(); });
watch(options, values => { active.value = values.findIndex(value => !value.disabled); });
watch(() => [props.disabled, props.readonly], close);
defineExpose({ getter: state.getValue, setter: state.setText, openMention, captureSelection, focus: focusEnd, blur: () => editor.value?.blur(), insertText, getValue: state.getValue, setValue: state.setText, getText: () => exportInput(state.doc.value, props.serializeMention).text });
</script>

<template>
  <div ref="root" class="markdown-input" :class="{ 'md-input-styled': !unstyled, dark: theme === 'dark', 'is-disabled': disabled, 'is-readonly': readonly }" :data-theme="theme || undefined" :style="style">
    <div class="md-input__field">
      <div ref="editor" class="md-input__editor" :class="{ 'is-empty': isEmpty }" :contenteditable="!disabled && !readonly" role="textbox" aria-multiline="true" :aria-label="placeholder" :aria-disabled="disabled" :aria-readonly="readonly" :tabindex="disabled ? -1 : 0" :data-placeholder="placeholder" spellcheck="false"
        :aria-controls="search ? menuId : undefined" :aria-expanded="!!search" :aria-activedescendant="search && active >= 0 ? `${menuId}-${active}` : undefined" aria-autocomplete="list"
        @beforeinput="beforeInput($event as InputEvent)" @input="state.input" @compositionstart="state.compositionStart" @compositionend="state.compositionEnd" @keydown="keydown" @keyup="captureSelection" @click="editorClick" 
        @focus="emit('focus', $event)" @blur="blur"
        @copy="state.copy($event)" @cut="state.copy($event, true)" @paste="state.paste" @drop.prevent @dragover.prevent />
    </div>
    <div v-if="search" :class="{ 'is-panel': panelQuery }" :id="menuId" class="md-input__menu" :style="menuStyle" role="listbox" aria-label="引用候选" :aria-busy="loading" @mousedown.prevent>
      <div v-if="panelQuery" class="md-input__query"><input ref="queryInput" :value="search.query" aria-label="搜索引用" placeholder="输入关键词搜索" @mousedown.stop @blur="panelBlur" @beforeinput="queryBeforeInput($event as InputEvent)" @input="queryInputEvent" @compositionstart="queryComposing = true" @compositionend="queryComposing = false; queryInputEvent($event)" @keydown="keydown"><button type="button" aria-label="关闭引用" @click="cancelSearch">×</button></div>
      <slot name="mention-header" :search="search"><div v-if="search.source" class="md-input__status">{{ search.source }} · 输入关键词搜索</div></slot>
      <div v-if="loading" class="md-input__status" role="status"><slot name="loading">正在搜索…</slot></div>
      <template v-else>
        <div v-if="!options.length" class="md-input__status"><slot name="empty">没有匹配的内容</slot></div>
        <div v-for="(option, index) in options" :id="`${menuId}-${index}`" :key="`${option.kind || ''}:${option.value}:${index}`" class="md-input__option" role="option" :aria-selected="active === index" :aria-disabled="option.disabled || undefined" @mousemove="!option.disabled && (active = index)" @click="choose(option)">
          <slot name="label" :option="option" :prefix="search.prefix" :query="search.query" :source="search.source"><span>{{ option.label }}</span><small v-if="option.kind">{{ option.kind }}</small></slot>
        </div>
      </template>
      <slot name="mention-footer" :search="search" />
    </div>
  </div>
</template>
