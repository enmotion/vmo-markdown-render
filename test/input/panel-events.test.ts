// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, h } from 'vue';
import MarkdownInput from '../../components/markdown-input/markdown-input.vue';
import { setSelectionOffsets } from '../../components/markdown-input/dom';
import type { MarkdownInputProps } from '../../components/markdown-input/types';
const wrappers: VueWrapper[] = [];
beforeEach(() => { vi.spyOn(Range.prototype, 'getBoundingClientRect').mockReturnValue({ left:30,bottom:20 } as DOMRect); });
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function setup(props: MarkdownInputProps = {}, slots = {}) {
  const wrapper = mount(MarkdownInput, { attachTo:document.body, props: {
    mentionShortcuts:[{source:'member',keys:{key:'u',ctrl:true}}, {source:'kb',keys:{key:'k',ctrl:true},prefix:'#'}],
    mentionTriggers:[{source:'member',character:'@'}],
    options:[{source:'member',label:'Alice',value:'id-a',kind:'user',data:{id:1}}, {source:'member',label:'Bob',value:'id-b'}, {source:'member',label:'Disabled',value:'d',disabled:true}, {source:'kb',label:'KB',value:'kb'}], ...props,
  }, slots }); wrappers.push(wrapper);
  const editor = wrapper.get('.md-input__editor');
  const api = wrapper.vm as unknown as { getter(): unknown; setter(v:unknown):void; getText():string; openMention(s:string):void; captureSelection():void; focus():void; blur():void; insertText(t:string):void };
  const caret = (start:number,end=start) => { (editor.element as HTMLElement).focus(); setSelectionOffsets(editor.element as HTMLElement,start,end); };
  const open = async (source='member') => { api.openMention(source); await nextTick(); await nextTick(); return wrapper.get('input'); };
  const before = async (inputType:string,data:string|null=null, extras={}) => { const event = new InputEvent('beforeinput',{inputType,data,bubbles:true,cancelable:true,...extras}); editor.element.dispatchEvent(event); await nextTick(); return event; };
  return { wrapper, editor, api, caret, open, before, internal:(wrapper.vm as any).$ .setupState };
}
it('临时过滤、候选键盘循环、禁用候选与普通输入隔离', async () => {
  const { wrapper,editor,api,open } = setup();
  const query = await open();
  expect(wrapper.findAll('[role=option]')).toHaveLength(3);
  await query.setValue('ID-B'); expect(wrapper.findAll('[role=option]').map(o=>o.text())).toEqual(['Bob']);
  expect(api.getText()).toBe('');
  await query.setValue(''); await query.trigger('keydown',{key:'ArrowUp'}); expect(wrapper.findAll('[aria-selected=true]')[0].text()).toBe('Bob');
  await query.trigger('keydown',{key:'ArrowDown'}); expect(wrapper.findAll('[aria-selected=true]')[0].text()).toContain('Alice');
  await wrapper.findAll('[role=option]')[2].trigger('mousemove'); await wrapper.findAll('[role=option]')[2].trigger('click'); expect(wrapper.find('input').exists()).toBe(true);
  await wrapper.findAll('[role=option]')[1].trigger('mousemove'); await query.trigger('keydown',{key:'Enter'});
  expect(api.getter()).toEqual([{label:'Bob',id:'id-b',type:'member'},{type:'text',content:' '}]);
  expect(wrapper.emitted('select')).toHaveLength(1);
  await open(); await wrapper.get('input').trigger('keydown',{key:'Backspace'}); expect(wrapper.find('input').exists()).toBe(true);
  await wrapper.get('input').trigger('keydown',{key:' '}); expect(wrapper.find('input').exists()).toBe(false);
  await open(); await wrapper.get('button[aria-label="关闭引用"]').trigger('click'); expect(wrapper.find('[role=listbox]').exists()).toBe(false);
  api.focus(); api.insertText('tail'); api.blur(); expect(wrapper.emitted('blur')).toBeDefined();
  await editor.trigger('click'); await editor.trigger('keyup'); expect(api.getText()).toBe('{"label":"Bob","id":"id-b","type":"member"} tail');
});
it('候选输入法组词、空格取消、面板内外焦点与输入事件', async () => {
  const {wrapper,editor,api,open} = setup({modelValue:'hello '});
  let query = await open();
  await query.trigger('compositionstart'); await query.setValue('A'); await query.trigger('keydown',{key:'Enter'}); expect(wrapper.emitted('select')).toBeUndefined();
  await query.trigger('beforeinput',{inputType:'insertText',data:' ',isComposing:true}); expect(wrapper.find('input').exists()).toBe(true);
  await query.trigger('compositionend'); expect(wrapper.findAll('[role=option]')[0].text()).toContain('Alice');
  await query.setValue('A'); await query.trigger('blur',{relatedTarget:editor.element}); expect(wrapper.find('input').exists()).toBe(true);
  await editor.trigger('blur',{relatedTarget:query.element}); expect(wrapper.find('input').exists()).toBe(true);
  await query.trigger('blur',{relatedTarget:null}); expect(wrapper.find('input').exists()).toBe(false);
  for (const inputType of ['insertText','insertParagraph','insertLineBreak']) {
    query = await open(); await query.trigger('beforeinput',{inputType,data:inputType==='insertText'?' ':null}); expect(wrapper.find('input').exists()).toBe(false);
  }
  query=await open(); await query.setValue('A B'); expect(wrapper.find('input').exists()).toBe(false); expect(api.getText()).toBe('hello ');
  query=await open(); await query.trigger('blur',{relatedTarget:document.createElement('button')}); expect(wrapper.find('input').exists()).toBe(false);
  await open(); await editor.trigger('blur',{relatedTarget:null}); expect(wrapper.find('input').exists()).toBe(false);
});
it('组合键、快捷键切换、选区保护、Mac 撤销重做和候选关闭', async () => {
  const {wrapper,editor,api,caret,open} = setup({modelValue:'abc'});
  caret(0,2); await editor.trigger('keydown',{key:'u',ctrlKey:true}); expect(wrapper.find('input').exists()).toBe(false);
  caret(3); await editor.trigger('keydown',{key:'u',ctrlKey:true}); await nextTick(); expect(wrapper.find('input').exists()).toBe(true);
  await wrapper.get('input').trigger('keydown',{key:'k',ctrlKey:true}); expect(wrapper.find('[role=option]').text()).toBe('KB');
  await wrapper.get('input').trigger('keydown',{key:'Escape'}); expect(wrapper.find('input').exists()).toBe(false);
  for (const extras of [{isComposing:true},{keyCode:229}]) { await editor.trigger('keydown',{key:'u',ctrlKey:true,...extras}); expect(wrapper.find('input').exists()).toBe(false); }
  vi.spyOn(navigator,'platform','get').mockReturnValue('MacIntel'); api.focus(); api.insertText('x'); await editor.trigger('keydown',{key:'z',metaKey:true}); expect(api.getText()).toBe('abc');
  await editor.trigger('keydown',{key:'z',metaKey:true,shiftKey:true}); expect(api.getText()).toBe('abcx');
  vi.spyOn(navigator,'platform','get').mockReturnValue('Linux'); await editor.trigger('keydown',{key:'z',ctrlKey:true}); await editor.trigger('keydown',{key:'y',ctrlKey:true}); expect(api.getText()).toBe('abcx');
  for(const key of ['ArrowLeft','ArrowRight','Home','End','Tab']) { await open(); await editor.trigger('keydown',{key}); expect(wrapper.find('input').exists()).toBe(false); }
  await open(); api.captureSelection(); await editor.trigger('compositionstart'); await nextTick(); expect(wrapper.find('input').exists()).toBe(false); api.openMention('member'); expect(wrapper.find('input').exists()).toBe(false); await editor.trigger('compositionend');
});
it('直接触发、兼容 prefix、选区替换与移动端换行语义', async () => {
  const {wrapper,editor,api,caret,before} = setup({modelValue:'hello ',prefix:'$'});
  caret(6); await before('insertText','@'); expect(wrapper.find('input').exists()).toBe(true); expect(api.getText()).toBe('hello @');
  await wrapper.get('input').trigger('keydown',{key:'Escape'});
  api.setter(' '); await nextTick(); caret(1); await before('insertText','$'); expect(wrapper.findAll('[role=option]')).toHaveLength(4);
  await wrapper.findAll('[role=option]')[0].trigger('click'); expect(api.getter()).toEqual([{type:'text',content:' '},{id:'id-a',label:'Alice',type:'member'},{type:'text',content:' '}]);
  api.setter('hello '); await nextTick(); caret(0,6); await before('insertText','@'); expect(wrapper.find('input').exists()).toBe(false); expect(api.getText()).toBe('@');
  api.setter('9. item'); api.focus(); await before('insertParagraph'); expect(api.getText()).toBe('9. item\n10. ');
  await before('insertParagraph'); expect(api.getText()).toBe('9. item\n\n');
  api.setter('- a'); api.focus(); await editor.trigger('keydown',{key:'Enter'}); expect(api.getText()).toBe('- a\n- ');
  await editor.trigger('keydown',{key:'Enter',shiftKey:true}); expect(api.getText()).toBe('- a\n- \n');
  api.setter('- tail'); caret(2); await before('insertParagraph'); expect(api.getText()).toBe('- \n- tail');
  await before('insertLineBreak'); expect(api.getText()).toBe('- \n- \ntail');
  await editor.trigger('input');
});
it('远程加载、无候选导航、自定义过滤与插槽', async () => {
  const {wrapper,api,open} = setup({loading:true,filterOption:()=>true},{loading:()=>h('b','Wait'),empty:()=>h('b','Empty'),label:({option}:any)=>h('i',option.label), 'mention-header':()=>h('header','Header'),'mention-footer':()=>h('footer','Footer')});
  let query = await open(); expect(wrapper.text()).toContain('Wait'); await query.trigger('keydown',{key:'Enter'}); expect(api.getText()).toBe('');
  await wrapper.setProps({loading:false,options:[]}); expect(wrapper.text()).toContain('Empty'); await query.trigger('keydown',{key:'ArrowUp'}); await query.trigger('keydown',{key:'ArrowDown'}); await query.trigger('keydown',{key:'Enter'}); expect(api.getText()).toBe('');
  await wrapper.setProps({options:[{source:'member',value:'a',label:'A',disabled:true}]}); await query.trigger('keydown',{key:'ArrowDown'}); expect(wrapper.find('[aria-selected=true]').exists()).toBe(false);
  await wrapper.setProps({options:[{source:'member',value:'b',label:'B'}]}); expect(wrapper.find('i').text()).toBe('B'); await wrapper.get('[role=option]').trigger('click'); expect(api.getText()).toBe('{"label":"B","id":"b","type":"member"} ');
  api.openMention('missing'); await nextTick(); expect(wrapper.find('input').exists()).toBe(false);
  await open(); await wrapper.setProps({mentionShortcuts:[]}); expect(wrapper.find('input').exists()).toBe(false);
  await open(); await wrapper.setProps({mentionTriggers:[]}); expect(wrapper.find('input').exists()).toBe(false);
});
it('禁用只读、输入法和外部改写使候选失效', async () => {
  const {wrapper,editor,api,open,before} = setup({modelValue:'a'});
  for (const name of ['disabled','readonly'] as const) {
    await open(); await wrapper.setProps({[name]:true}); api.openMention('member'); await editor.trigger('keydown',{key:'Enter'}); const event=await before('insertText','b'); expect(event.defaultPrevented).toBe(true); expect(api.getText()).toBe('a'); await wrapper.setProps({[name]:false});
  }
  await editor.trigger('compositionstart'); await before('insertText','b'); await editor.trigger('keydown',{key:'Enter'}); await editor.trigger('compositionend');
  await before('insertText','b',{isComposing:true}); expect(api.getText()).toBe('a');
  await open(); await wrapper.setProps({modelValue:'external'}); expect(wrapper.find('input').exists()).toBe(false);
  await wrapper.setProps({fontBaseSize:-1,theme:'dark',unstyled:true}); expect(wrapper.attributes('style')).toContain('12px'); expect(wrapper.classes()).toContain('dark'); expect(wrapper.classes()).not.toContain('md-input-styled');
});
it('编辑区复制剪切粘贴和拖放绑定', async () => {
  const {editor,api,caret} = setup({modelValue:'abc'}); caret(0,1);
  const data=new Map<string,string>(); const clipboardData={getData:(k:string)=>data.get(k)??'',setData:(k:string,v:string)=>data.set(k,v)};
  for(const event of ['copy','cut','paste']) await editor.trigger(event,{clipboardData});
  expect(api.getText()).toBe('abc'); await editor.trigger('drop'); await editor.trigger('dragover');
});
it('原生默认触发、可视视口样式与无分类候选', async () => {
  const viewport = new EventTarget(); Object.assign(viewport,{height:500,offsetTop:0}); vi.stubGlobal('visualViewport',viewport);
  const {wrapper,api,caret,before} = setup({modelValue:' ', prefix:['$'],options:[{label:'Free',value:'free'}]});
  await nextTick(); expect(wrapper.attributes('style')).toContain('325px');
  caret(1); await before('formatBold'); await before('insertText','$');
  await wrapper.get('input').trigger('beforeinput',{inputType:'insertText',data:null});
  await wrapper.get('input').trigger('mousedown'); await wrapper.get('[role=listbox]').trigger('mousedown');
  await wrapper.get('[role=option]').trigger('click');
  expect(api.getter()).toEqual([{type:'text',content:' '},{id:'free',label:'Free'},{type:'text',content:' '}]);
});
it('已关闭或切换分类时，旧候选回调不能插入', async () => {
  const {wrapper,api,open,internal} = setup();
  await open(); const stale = wrapper.get('[role=option]');
  await open('kb'); await stale.trigger('click'); expect(api.getText()).toBe('');
  await wrapper.get('input').trigger('keydown',{key:'Escape'}); await stale.trigger('click'); expect(api.getText()).toBe('');
  internal.announce(); expect(wrapper.find('input').exists()).toBe(false);
});
