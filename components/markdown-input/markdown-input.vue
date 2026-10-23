<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, onBeforeUnmount, ref, toRef, watch } from 'vue';
import type { InputValue, InputCodecError, InputEnterContext, InputMentionNode, MarkdownInputProps, MentionOption, MentionSearch } from './types';
import { useInputI18n } from './i18n';
import { useKeyboardInset } from './use-keyboard-inset';
import { matchMentionTrigger } from './triggers';
import { matchMentionShortcut } from './shortcuts';
import { placeMentionMenu } from './placement';
import { linePrefix } from './markdown';
import { documentLength, exportInput, sliceDocument } from './document';
import { useInputEditor } from './use-editor';
import { useMarkdownTheme } from '../markdown-render/composables/theme';
import { themeColorStyles } from '../markdown-render/theme-colors';
import { getSelectionOffsets, setSelectionOffsets } from './dom';

const props = withDefaults(defineProps<MarkdownInputProps>(), {
  filterOption: undefined, prefix: () => [], mentionTriggers: () => [], mentionShortcuts: () => [], options: () => [], loading: false,
  placement: 'auto', offset: 6, mobilePlacement: 'bottom-sheet',
  disabled: false, readonly: false, theme: '', fontBaseSize: 12, unstyled: false,
});
const emit = defineEmits<{
  (event: 'update:modelValue', value: InputValue): void;
  (event: 'search', value: MentionSearch): void;
  (event: 'select', option: MentionOption, context: MentionSearch): void;
  (event: 'mention-remove', node: InputMentionNode): void;
  (event: 'enter', value: KeyboardEvent, context: InputEnterContext): void;
  (event: 'error', value: InputCodecError): void;
  (event: 'focus', value: FocusEvent): void;
  (event: 'blur', value: FocusEvent): void;
}>();
const text = useInputI18n(props);
const inputPlaceholder = computed(() => props.placeholder ?? text.value.placeholder);
const root = ref<HTMLElement>();
const editor = ref<HTMLElement>();
const { theme } = useMarkdownTheme(toRef(props, 'theme'), root);
const { inset, height: viewportHeight } = useKeyboardInset();
const state = useInputEditor(props, editor, emit);
const { composing } = state;
const menuId = `md-mention-${getCurrentInstance()!.uid}`;
const active = ref(0);
const search = ref<(MentionSearch & { start: number; end: number })>();
let queryComposing = false;
const queryDraft = ref('');
const queryInput = ref<HTMLInputElement>();
let bookmark: [number, number] | undefined;
const menuStyle = ref<Record<string, string>>({});
const menu = ref<HTMLElement>();
const resolvedPlacement = ref<'top' | 'bottom'>('bottom');
let anchorRange: Range | undefined;
let resizeObserver: ResizeObserver | undefined;
let viewport: VisualViewport | null | undefined;
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
function close() { search.value = undefined; queryComposing = false; }
function cancelSearch() {
  const end = search.value?.end;
  close();
  if (end !== undefined && editor.value) {
    editor.value.focus(); setSelectionOffsets(editor.value, end); captureSelection();
  }
}
function startSearch(source: string | undefined, prefix: string, start: number, end: number) {
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : undefined;
  anchorRange = range && editor.value?.contains(range.startContainer) ? range.cloneRange() : undefined;
  queryDraft.value = '';
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
    if (!search.value || !root.value || !editor.value || !menu.value) return;
    const caret = anchorRange?.getBoundingClientRect();
    const anchor = caret && (caret.height || caret.width) ? caret : editor.value.getBoundingClientRect();
    const outer = root.value.getBoundingClientRect();
    const result = placeMentionMenu(anchor,
      { left: outer.left + root.value.clientLeft, top: outer.top + root.value.clientTop, width: root.value.clientWidth, bottom: outer.bottom },
      Math.min(menu.value.scrollHeight + 2, (parseFloat(getComputedStyle(menu.value).fontSize) || 12) * 18),
      viewport ? { left: viewport.offsetLeft, top: viewport.offsetTop, width: viewport.width, height: viewport.height }
        : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }, props.placement, props.offset);
    resolvedPlacement.value = result.placement;
    menuStyle.value = { left: `${result.left}px`, top: `${result.top}px`, width: `${result.width}px`, maxHeight: `min(18em, ${result.maxHeight}px)` };
  });
}
onMounted(() => {
  viewport = window.visualViewport;
  window.addEventListener('resize', positionMenu);
  window.addEventListener('scroll', positionMenu, true);
  viewport?.addEventListener('resize', positionMenu);
  viewport?.addEventListener('scroll', positionMenu);
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(positionMenu);
    resizeObserver.observe(root.value!);
  }
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', positionMenu);
  window.removeEventListener('scroll', positionMenu, true);
  viewport?.removeEventListener('resize', positionMenu);
  viewport?.removeEventListener('scroll', positionMenu);
  resizeObserver?.disconnect();
});
watch(menu, (current, previous) => {
  if (previous) resizeObserver?.unobserve(previous);
  if (current) { resizeObserver?.observe(current); positionMenu(); }
});
watch(() => [props.placement, props.offset, props.mobilePlacement, options.value, text.value], positionMenu);
function announce() {
  const context = search.value;
  if (!context) return;
  active.value = 0;
  emit('search', { prefix: context.prefix, query: context.query, source: context.source, requestId: context.requestId });
  positionMenu();
}
function beforeInput(event: InputEvent) {
  if (props.disabled || props.readonly || composing.value || event.isComposing) { state.beforeInput(event); return; }
  if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak') {
    event.preventDefault();
    if (event.inputType === 'insertParagraph') newline(); else state.insertText('\n');
    return;
  }
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
  const mention: InputMentionNode = { type: 'mention', content: { id: option.value, label: option.label, type: option.source ?? context.source, data: option.data } };
  state.replace(context.start, context.end, { version: 1, nodes: [mention, { type: 'text', content: ' ' }] });
  close(); emit('select', option, { prefix: context.prefix, query: context.query, source: context.source, requestId: context.requestId });
}
function newline() {
  const [start] = state.selection();
  const before = exportInput(sliceDocument(state.doc.value, 0, start), () => '\ufffc').text;
  const line = before.slice(before.lastIndexOf('\n') + 1);
  const list = /^([ \t]*)(-|\d+\.)( +)(.*)$/.exec(line);
  const after = exportInput(sliceDocument(state.doc.value, state.selection()[1], documentLength(state.doc.value)), () => '\ufffc').text.split('\n')[0];
  if (list && !(list[4] + after).trim()) { state.replace(start - line.length, start, { version: 1, nodes: [{ type: 'text', content: '\n' }] }); return; }
  const marker = list ? /^\d/.test(list[2]) ? `${parseInt(list[2]) + 1}.` : list[2] : '';
  state.insertText('\n' + (list ? list[1] + marker + list[3] : ''));
}
function keydown(event: KeyboardEvent) {
  if (event.isComposing || queryComposing || composing.value || event.keyCode === 229 || props.disabled || props.readonly) return;
  const shortcut = matchMentionShortcut(event, props.mentionShortcuts);
  if (shortcut) {
    const [start, end] = event.target === queryInput.value && search.value
      ? [search.value.start, search.value.end] : state.selection();
    if (start !== end && event.target !== queryInput.value) return;
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
  const prefix = linePrefix(before.slice(before.lastIndexOf('\n') + 1));
  emit('enter', event, { inCode: false, inList: !!prefix });
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
      <div ref="editor" class="md-input__editor" :class="{ 'is-empty': isEmpty }" :contenteditable="!disabled && !readonly" role="textbox" aria-multiline="true" :aria-label="inputPlaceholder" :aria-disabled="disabled" :aria-readonly="readonly" :tabindex="disabled ? -1 : 0" :data-placeholder="inputPlaceholder" spellcheck="false"
        :aria-controls="search ? menuId : undefined" :aria-expanded="!!search" :aria-activedescendant="search && active >= 0 ? `${menuId}-${active}` : undefined" aria-autocomplete="list"
        @beforeinput="beforeInput($event as InputEvent)" @input="state.input" @compositionstart="state.compositionStart" @compositionend="state.compositionEnd" @keydown="keydown" @keyup="captureSelection" @click="editorClick" 
        @focus="emit('focus', $event)" @blur="blur"
        @copy="state.copy($event)" @cut="state.copy($event, true)" @paste="state.paste" @drop.prevent @dragover.prevent />
    </div>
    <div v-if="search" ref="menu" :id="menuId" class="md-input__menu is-panel" :class="{ 'is-sheet': mobilePlacement === 'bottom-sheet' }" :data-placement="resolvedPlacement" :style="menuStyle" role="listbox" :aria-label="text.mentionCandidates" :aria-busy="loading" @mousedown.prevent>
      <div class="md-input__query"><input ref="queryInput" v-model="queryDraft" :aria-label="text.mentionSearchLabel" :placeholder="text.mentionSearchPlaceholder" @mousedown.stop @blur="panelBlur" @beforeinput="queryBeforeInput($event as InputEvent)" @input="queryInputEvent" @compositionstart="queryComposing = true" @compositionend="queryComposing = false; queryInputEvent($event)" @keydown="keydown"><button type="button" :aria-label="text.mentionClose" @click="cancelSearch">×</button></div>
      <slot name="mention-header" :search="search"><div v-if="search.source" class="md-input__status">{{ search.source }} · {{ text.mentionHint }}</div></slot>
      <div v-if="loading" class="md-input__status" role="status"><slot name="loading">{{ text.mentionLoading }}</slot></div>
      <template v-else>
        <div v-if="!options.length" class="md-input__status"><slot name="empty">{{ text.mentionEmpty }}</slot></div>
        <div v-for="(option, index) in options" :id="`${menuId}-${index}`" :key="`${option.kind || ''}:${option.value}:${index}`" class="md-input__option" role="option" :aria-selected="active === index" :aria-disabled="option.disabled || undefined" @mousemove="!option.disabled && (active = index)" @click="choose(option)">
          <slot name="label" :option="option" :prefix="search.prefix" :query="search.query" :source="search.source"><span>{{ option.label }}</span><small v-if="option.kind">{{ option.kind }}</small></slot>
        </div>
      </template>
      <slot name="mention-footer" :search="search" />
    </div>
  </div>
</template>
