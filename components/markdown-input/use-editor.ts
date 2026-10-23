import { defaultInputCodec } from './codec';
import { ref, watch, onMounted, type Ref } from 'vue';
import type { InputValue, InputDocument, InputMentionNode, InputCodecError, MarkdownInputProps } from './types';
import { documentLength, emptyDocument, exportInput, normalizeDocument, replaceDocument, sliceDocument } from './document';
import { getSelectionOffsets, paintDocument, readDocument, setSelectionOffsets } from './dom';

export const clipboardType = 'application/x-vmo-markdown-input+json';
export function useInputEditor(props: MarkdownInputProps, root: Ref<HTMLElement | undefined>, emit: {
  (event: 'update:modelValue', value: InputValue): void;
  (event: 'error', error: InputCodecError): void;
  (event: 'mention-remove', node: InputMentionNode): void;
}) {
  function decode(text: InputValue): InputDocument {
    try {
      const result = (props.setter ?? defaultInputCodec.decode)(text);
      if (!result || result.version !== 1 || !Array.isArray(result.nodes)) throw new TypeError();
      return normalizeDocument(result);
    }
    catch { emit('error', { stage: 'decode', message: '文本解析失败，已保留为普通文字' }); return { version: 1, nodes: typeof text === 'string' && text ? [{ type: 'text', content: text }] : [] }; }
  }
  function getValue(): InputValue {
    try {
      const result = (props.getter ?? defaultInputCodec.encode)(normalizeDocument(doc.value));
      if (typeof result !== 'string' && !Array.isArray(result)) throw new TypeError();
      return result;
    } catch { emit('error', { stage: 'encode', message: '文本编码失败，已使用默认转换保留内容' }); return defaultInputCodec.encode(doc.value); }
  }
  const doc = ref(decode(props.modelValue ?? []));
  let lastPublished: InputValue | undefined;
  const composing = ref(false);
  const revision = ref(0);
  const externalRevision = ref(0);
  const history: { doc: InputDocument; selection: [number, number] }[] = [];
  let historyIndex = -1;
  let deferred: InputDocument | undefined;
  let publishAfterComposition = false;
  const editable = () => !props.disabled && !props.readonly;
  const selection = (): [number, number] => root.value && getSelectionOffsets(root.value) || [documentLength(doc.value), documentLength(doc.value)];
  function paint(caret?: [number, number]) {
    if (!root.value) return;
    paintDocument(root.value, doc.value, position => {
      if (!editable()) return;
      replace(position, position + 1, emptyDocument());
    }, editable());
    if (caret) { root.value.focus(); setSelectionOffsets(root.value, ...caret); }
  }
  function record(caret: [number, number]) {
    history.splice(historyIndex + 1);
    history.push({ doc: normalizeDocument(doc.value), selection: caret });
    if (history.length > 100) history.shift();
    historyIndex = history.length - 1;
  }
  function publish() { revision.value++; lastPublished = getValue(); emit('update:modelValue', lastPublished); }
  function replace(start: number, end: number, inserted: InputDocument) {
    if (!editable()) return;
    if (history[historyIndex]) history[historyIndex].selection = selection();
    const removed = sliceDocument(doc.value, start, end).nodes.filter((node): node is InputMentionNode => node.type === 'mention');
    doc.value = replaceDocument(doc.value, start, end, inserted);
    const caret: [number, number] = [start + documentLength(inserted), start + documentLength(inserted)];
    paint(caret); record(caret); publish();
    removed.forEach(node => emit('mention-remove', node));
  }
  function insertText(text: string) { replace(...selection(), { version: 1, nodes: [{ type: 'text', content: text.replace(/\r\n?/g, '\n') }] }); }
  function undo(redo = false) {
    const next = historyIndex + (redo ? 1 : -1);
    if (!editable() || !history[next]) return;
    historyIndex = next; doc.value = normalizeDocument(history[next].doc);
    paint(history[next].selection); publish();
  }
  function beforeInput(event: InputEvent) {
    if (!editable()) { event.preventDefault(); return; }
    if (composing.value || event.isComposing) return;
    if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
      event.preventDefault(); undo(event.inputType === 'historyRedo'); return;
    }
    if (event.inputType.startsWith('insert') && event.inputType !== 'insertFromPaste') {
      event.preventDefault();
      if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak') insertText('\n');
      else if (event.data !== null) insertText(event.data);
    } else if (event.inputType.startsWith('delete')) {
      event.preventDefault();
      let [start, end] = selection();
      if (start === end) {
        const backward = event.inputType.includes('Backward');
        const text = exportInput(doc.value, () => '\ufffc').text;
        // 按 Unicode 码点删除，避免将 emoji 拆成半个代理项。
        if (backward) start -= Array.from(text.slice(0, start)).at(-1)?.length ?? 0;
        else end += Array.from(text.slice(end))[0]?.length ?? 0;
      }
      replace(start, end, emptyDocument());
    }
  }
  function input() {
    if (composing.value || !root.value || !editable()) return;
    const caret = selection();
    const next = readDocument(root.value);
    if (JSON.stringify(next) === JSON.stringify(doc.value)) return;
    doc.value = next;
    paint(caret); record(caret); publish();
  }
  function compositionStart() {
    composing.value = true;
    if (history[historyIndex]) history[historyIndex].selection = selection();
  }
  function compositionEnd() {
    composing.value = false;
    if (deferred) { doc.value = deferred; deferred = undefined; paint(); history.length = 0; record([0, 0]); externalRevision.value++; revision.value++; }
    else input();
    if (publishAfterComposition) { publishAfterComposition = false; publish(); }
  }
  function copy(event: ClipboardEvent, cut = false) {
    const [start, end] = selection();
    if (start === end || !event.clipboardData) return;
    const selected = sliceDocument(doc.value, start, end);
    event.preventDefault();
    event.clipboardData.setData('text/plain', exportInput(selected, props.serializeMention).text);
    event.clipboardData.setData(clipboardType, JSON.stringify(selected));
    if (cut && editable()) replace(start, end, emptyDocument());
  }
  function paste(event: ClipboardEvent) {
    event.preventDefault(); if (!editable() || !event.clipboardData) return;
    const structured = event.clipboardData.getData(clipboardType);
    if (structured) {
      try { const parsed = JSON.parse(structured); if (parsed.version === 1 && Array.isArray(parsed.nodes)) { replace(...selection(), normalizeDocument(parsed)); return; } } catch { /* 外部剪贴板降级纯文本。 */ }
    }
    const text = event.clipboardData.getData('text/plain');
    if (text) insertText(text);
  }
  function setValue(text: InputValue, force = false) {
    if (!force && (JSON.stringify(text) === JSON.stringify(lastPublished) || JSON.stringify(text) === JSON.stringify(getValue()))) { deferred = undefined; return; }
    const next = decode(text);
    lastPublished = undefined;
    if (composing.value) { deferred = next; return; }
    doc.value = next; paint(); history.length = 0; record([0, 0]); externalRevision.value++; revision.value++;
  }
  function setText(text: InputValue) {
    setValue(text, true);
    if (composing.value) publishAfterComposition = true;
    else publish();
  }
  watch(() => props.modelValue, value => setValue(value ?? []));
  // 转换函数可能来自父组件内联表达式；身份变化不触发导入/回写，避免重置选区或形成循环。
  watch(() => [props.disabled, props.readonly], () => paint());
  onMounted(() => { paint(); record([0, 0]); });
  return { getValue, setText, doc, composing, revision, externalRevision, selection, replace, insertText, undo, beforeInput, input, compositionStart, compositionEnd, copy, paste };
}
