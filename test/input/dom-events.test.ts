// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { getSelectionOffsets, setSelectionOffsets, readDocument, paintDocument } from '../../components/markdown-input/dom';
import { normalizeDocument } from '../../components/markdown-input/document';
import { defaultInputCodec } from '../../components/markdown-input/codec';
import { inlineDecorations } from '../../components/markdown-input/markdown';
import { matchMentionTrigger } from '../../components/markdown-input/triggers';
import { matchMentionShortcut } from '../../components/markdown-input/shortcuts';
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });
it('DOM 读取保留段落换行、尾标记、注释和非法标签不污染节点', () => {
  const root = document.createElement('div');
  root.innerHTML = 'a<!--comment--><div>b<br>c<br data-tail></div><p>d</p><span data-mention="bad">ignored</span><span data-mention=\'{"type":"mention","content":{"id":"1","label":"A"}}\'></span>';
  expect(readDocument(root).nodes).toEqual([{ type: 'text', content: 'a\nb\nc\nd' }, { type: 'mention', content: { id: '1', label: 'A' } }]);
});
it('选区按原始字符定位，原子标签、隐藏语法与 br 保持偏移', () => {
  const root = document.createElement('div'); document.body.append(root);
  root.innerHTML = '<style>.md-input__syntax{display:none}</style>';
  paintDocument(root, { version: 1, nodes: [{ type: 'text', content: '**A**\n' }, { type: 'mention', content: { id: '1', label: '标签' } }, { type: 'text', content: 'tail\n' }] }, vi.fn(), true);
  const style = document.createElement('style'); style.textContent = '.md-input__syntax{display:none}'; document.head.append(style);
  for (const [offset, expected] of [[0,0], [1,0], [2,2], [3,3], [4,3], [5,5], [6,6], [7,7], [8,8], [12,12], [100,12]]) {
    setSelectionOffsets(root, offset); expect(getSelectionOffsets(root)?.[0]).toBe(expected);
  }
  const selection = window.getSelection()!; selection.removeAllRanges(); expect(getSelectionOffsets(root)).toBeUndefined();
  const outside = document.createTextNode('outside'); document.body.append(outside); const range = document.createRange(); range.setStart(outside,0); range.setEnd(outside,2); selection.addRange(range); expect(getSelectionOffsets(root)).toBeUndefined();
  range.setStart(root,0); range.setEnd(root,1); selection.removeAllRanges(); selection.addRange(range); expect(getSelectionOffsets(root)).toEqual([0,5]);
  style.remove(); setSelectionOffsets(root, 4); expect(getSelectionOffsets(root)).toEqual([4,4]);
  vi.spyOn(window, 'getSelection').mockReturnValue(null); expect(getSelectionOffsets(root)).toBeUndefined(); setSelectionOffsets(root, 0);
});
it('受控标签删除按钮和只读渲染', () => {
  const root = document.createElement('div'); const remove = vi.fn();
  const doc = { version: 1 as const, nodes: [{ type: 'mention' as const, content: { id: '1', label: '<script>' } }] };
  paintDocument(root, doc, remove, true);
  expect(root.querySelector('script')).toBeNull(); const button = root.querySelector('button')!;
  const event = new MouseEvent('mousedown', { cancelable: true }); button.dispatchEvent(event); expect(event.defaultPrevented).toBe(true); button.click(); expect(remove).toHaveBeenCalledWith(0);
  paintDocument(root, doc, remove, false); expect(root.querySelector('button')).toBeNull();
  paintDocument(root, { version: 1, nodes: [] }, remove, true); expect(root.querySelector('br')?.hasAttribute('data-tail')).toBe(true);
  paintDocument(root, { version: 1, nodes: [{ type: 'text', content: '1. first\n- second\n\n' }] }, remove, true);
  expect(root.querySelectorAll('[data-block]')).toHaveLength(2);
});
it('输入边界与坏数据：空对象、相邻文本、循环 data 和无效值', () => {
  expect(normalizeDocument(null).nodes).toEqual([]);
  expect(normalizeDocument({ version:1, nodes:[null, {}, { type:'text',content:'a' }, { type:'text',content:'b' }] }).nodes).toEqual([{ type:'text',content:'ab' }]);
  const data: Record<string,unknown> = {}; data.self = data;
  expect(normalizeDocument({version:1,nodes:[{type:'mention',content:{id:'a',label:'A',data}}]}).nodes).toEqual([]);
  expect(() => defaultInputCodec.decode(null as never)).toThrow();
  expect(matchMentionTrigger('/', ' ', [], ['/'])).toEqual({ character:'/', source:undefined });
  expect(matchMentionTrigger('@', ' ', [{character:'@',source:''}])).toBeUndefined();
  const event = {key:'!',code:'Digit1',ctrlKey:true,altKey:false,metaKey:false,shiftKey:false} as KeyboardEvent;
  expect(matchMentionShortcut(event,[{source:'a',keys:{key:'1',ctrl:true}}])?.source).toBe('a');
  for (const shortcut of [{source:'',keys:{key:'a',ctrl:true}}, {source:'a',keys:null}, {source:'a',keys:{key:'ab',ctrl:true}}, {source:'a',keys:{key:' ',ctrl:true}}]) expect(matchMentionShortcut(event,[shortcut as never])).toBeUndefined();
  expect(inlineDecorations('plain')).toEqual([]);
});
it('DOM 接口返回空 textContent 时安全降级', () => {
  const root=document.createElement('div'); document.body.append(root); const node=document.createTextNode(''); root.append(node);
  vi.spyOn(node,'textContent','get').mockReturnValue(null);
  expect(readDocument(root).nodes).toEqual([]); setSelectionOffsets(root,1); expect(getSelectionOffsets(root)).toEqual([0,0]);
});
