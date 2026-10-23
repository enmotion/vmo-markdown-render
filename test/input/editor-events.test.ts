// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, reactive, ref } from 'vue';
import { useInputEditor, clipboardType } from '../../components/markdown-input/use-editor';
import { getSelectionOffsets, setSelectionOffsets } from '../../components/markdown-input/dom';
import { useKeyboardInset } from '../../components/markdown-input/use-keyboard-inset';
import type { MarkdownInputProps } from '../../components/markdown-input/types';
const mounted: { unmount(): void }[] = [];
afterEach(() => { mounted.splice(0).forEach(w => w.unmount()); document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function harness(initial: MarkdownInputProps = {}) {
  const props = reactive<MarkdownInputProps>(initial); const emit = vi.fn();
  let api!: ReturnType<typeof useInputEditor>;
  const root = ref<HTMLElement>();
  const wrapper = mount(defineComponent({ setup() { api = useInputEditor(props, root, emit); return () => h('div', { ref: root, contenteditable: true }); } }), { attachTo: document.body });
  mounted.push(wrapper);
  const element = wrapper.element as HTMLElement;
  const caret = (start: number, end = start) => { element.focus(); setSelectionOffsets(element, start, end); };
  const text = () => api.doc.value.nodes.map(n => n.type === 'text' ? n.content : n.content.label).join('');
  const input = (inputType: string, data: string | null = null, isComposing = false) => { const event = new InputEvent('beforeinput', { inputType, data, isComposing, cancelable: true }); api.beforeInput(event); return event; };
  const clip = (values: Record<string, string> = {}) => { const data = new Map(Object.entries(values)); return { event: { clipboardData: { getData: (key: string) => data.get(key) ?? '', setData: (key: string, value: string) => data.set(key, value) }, preventDefault: vi.fn() } as unknown as ClipboardEvent, data }; };
  return { props, emit, api, root, wrapper, element, caret, text, input, clip };
}
it('编辑历史、码点删除、只读保护和有界撤销', async () => {
  const { api, props, input, caret, text } = harness();
  input('insertText', '😀a'); expect(text()).toBe('😀a');
  caret(2); input('deleteContentBackward'); expect(text()).toBe('a');
  caret(0); input('deleteContentForward'); expect(text()).toBe('');
  input('deleteContentBackward'); input('deleteContentForward');
  input('insertText', 'abc'); caret(0, 2); input('deleteContentForward'); expect(text()).toBe('c');
  input('historyUndo'); expect(text()).toBe('abc'); input('historyRedo'); expect(text()).toBe('c');
  input('insertText'); input('insertFromPaste', 'ignored'); input('formatBold');
  caret(1); input('insertParagraph'); input('insertLineBreak'); expect(text()).toBe('c\n\n');
  props.disabled = true; expect(input('insertText', 'x').defaultPrevented).toBe(true); api.undo(); api.insertText('x'); expect(text()).toBe('c\n\n');
  props.disabled = false; props.readonly = true; api.insertText('x'); expect(text()).toBe('c\n\n');
  props.readonly = false;
  for (let i = 0; i < 103; i++) api.insertText('x');
  for (let i = 0; i < 105; i++) api.undo();
  expect(text().length).toBe(7);
  await nextTick();
});
it('DOM 原生输入、输入法与外部写入延迟处理', async () => {
  const { api, props, element, root, input, text, emit } = harness({ modelValue: 'start' });
  api.input(); expect(emit).not.toHaveBeenCalled();
  api.compositionStart(); expect(input('insertText', 'x', true).defaultPrevented).toBe(false); api.input();
  element.textContent = '组词'; api.compositionEnd(); expect(text()).toBe('组词');
  expect(input('insertText', 'x', true).defaultPrevented).toBe(false);
  api.compositionStart(); props.modelValue = 'external'; await nextTick(); api.input(); expect(text()).toBe('组词');
  api.compositionEnd(); expect(text()).toBe('external');
  api.compositionStart(); api.setText('forced'); expect(text()).toBe('external'); api.compositionEnd(); expect(text()).toBe('forced');
  api.compositionStart(); props.modelValue = 'other'; await nextTick(); props.modelValue = api.getValue(); await nextTick(); api.compositionEnd(); expect(text()).toBe('forced');
  element.textContent = '原生'; api.input(); expect(text()).toBe('原生');
  root.value = undefined; api.input(); api.insertText('tail'); expect(text()).toBe('原生tail');
  props.modelValue = undefined; await nextTick(); expect(text()).toBe('');
});
it('结构化复制粘贴、剪切移除事件及纯文本降级', () => {
  const { api, clip, caret, text, props, emit } = harness({ modelValue: [{ type: 'text', content: 'a' }, { label: '<img>', id: '1' }] });
  caret(0); const empty = clip(); api.copy(empty.event); expect(empty.event.preventDefault).not.toHaveBeenCalled();
  caret(0, 2); api.copy({ clipboardData: null } as ClipboardEvent);
  const copied = clip(); api.copy(copied.event); expect(copied.data.get('text/plain')).toBe('a{"label":"<img>","id":"1"}'); expect(JSON.parse(copied.data.get(clipboardType)!).nodes[1].content.id).toBe('1');
  api.copy(copied.event, true); expect(text()).toBe(''); expect(emit).toHaveBeenCalledWith('mention-remove', expect.objectContaining({ type: 'mention' }));
  api.paste(copied.event); expect(text()).toBe('a<img>');
  for (const invalid of ['{', '{"version":2}', '{"version":1}']) { const paste = clip({ [clipboardType]: invalid, 'text/plain': 'fallback' }); api.paste(paste.event); }
  expect(text()).toContain('fallback');
  api.paste(clip().event); api.paste({ clipboardData: null, preventDefault: vi.fn() } as unknown as ClipboardEvent);
  props.readonly = true; const before = text(); api.paste(clip({ 'text/plain': 'ignored' }).event); api.copy(copied.event, true); expect(text()).toBe(before);
  props.readonly = false; api.undo();
  const button = (api.doc.value.nodes.some(n => n.type === 'mention') ? document.querySelector('button') : null);
  if (button) { button.dispatchEvent(new MouseEvent('mousedown', { cancelable: true })); (button as HTMLElement).click(); }
});
it('自定义转换返回无效值时降级，数组回写不重建 DOM', async () => {
  const { api, props, emit, element } = harness({ modelValue: [{ label: 'A', id: 'a' }] });
  const tag = element.firstChild;
  props.modelValue = api.getValue(); await nextTick(); expect(element.firstChild).toBe(tag);
  props.setter = () => null as never; api.setText([]); expect(api.doc.value.nodes).toEqual([]);
  props.setter = () => ({ version: 2, nodes: [] } as never); api.setText('safe'); expect(api.doc.value.nodes).toEqual([{ type: 'text', content: 'safe' }]);
  props.setter = () => ({ version: 1, nodes: null } as never); api.setText('safe');
  props.getter = () => null as never; expect(api.getValue()).toEqual([{ type: 'text', content: 'safe' }]);
  expect(emit).toHaveBeenCalledWith('error', expect.objectContaining({ stage: 'encode' }));
});
it('缺失挂载目标仍可编辑且无历史时撤销安全', () => {
  let api!: ReturnType<typeof useInputEditor>;
  const wrapper = mount(defineComponent({ setup() { api = useInputEditor({}, ref(), vi.fn()); api.undo(); api.compositionStart(); return () => h('div'); } })); mounted.push(wrapper);
  api.compositionEnd(); api.insertText('a'); expect(api.getValue()).toEqual([{ type: 'text', content: 'a' }]);
});
it('软键盘可视视口变化与卸载清理，缺失视口回退', () => {
  const viewport = new EventTarget() as EventTarget & { height: number; offsetTop: number };
  viewport.height = 300; viewport.offsetTop = 10;
  vi.stubGlobal('visualViewport', viewport); vi.stubGlobal('innerHeight', 800);
  let result!: ReturnType<typeof useKeyboardInset>;
  const wrapper = mount(defineComponent({ setup() { result = useKeyboardInset(); return () => h('div'); } }));
  expect(result.inset.value).toBe(490); viewport.height = 900; viewport.dispatchEvent(new Event('resize')); expect(result.inset.value).toBe(0);
  wrapper.unmount(); viewport.height = 100; viewport.dispatchEvent(new Event('scroll')); expect(result.height.value).toBe(900);
  vi.stubGlobal('visualViewport', undefined);
  const fallback = mount(defineComponent({ setup() { result = useKeyboardInset(); return () => h('div'); } })); expect(result.inset.value).toBe(0); fallback.unmount();
});
it('禁用前残留的删除按钮不允许改变内容', () => {
  const {api,props,element,text} = harness({modelValue:[{label:'A',id:'a'}]});
  const button=element.querySelector('button')!; props.disabled=true; button.click(); expect(text()).toBe('A'); expect(api.getValue()).toEqual([{label:'A',id:'a'}]);
});
