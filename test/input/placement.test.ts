// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import MarkdownInput from '../../components/markdown-input/markdown-input.vue';
import { placeMentionMenu } from '../../components/markdown-input/placement';
import { setSelectionOffsets } from '../../components/markdown-input/dom';
const container={left:100,top:100,bottom:200,width:400};
const viewport={left:0,top:0,width:800,height:600};
const anchor={left:150,top:160,bottom:180,width:0};
const wrappers:VueWrapper[]=[];
afterEach(()=>{wrappers.splice(0).forEach(w=>w.unmount());document.body.replaceChildren();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('默认向下、配置向上及不同 offset；方向空间不足自动翻转',()=>{
  expect(placeMentionMenu(anchor,container,100,viewport,'auto',6)).toEqual({placement:'bottom',left:50,top:86,width:300,maxHeight:406});
  expect(placeMentionMenu(anchor,container,100,viewport,'top',0)).toMatchObject({placement:'top',top:-40});
  expect(placeMentionMenu({...anchor,top:560,bottom:580},container,100,viewport,'bottom',12)).toMatchObject({placement:'top',top:348});
  expect(placeMentionMenu({...anchor,top:20,bottom:40},container,100,viewport,'top',12)).toMatchObject({placement:'bottom',top:-48});
  expect(placeMentionMenu({...anchor,top:300,bottom:320},container,500,viewport,'top',6)).toMatchObject({placement:'top',maxHeight:286});
  expect(placeMentionMenu({...anchor,top:270,bottom:290},container,500,viewport,'auto',6)).toMatchObject({placement:'bottom'});
  for(const offset of [-1,NaN,Infinity])expect(placeMentionMenu(anchor,container,100,viewport,'auto',offset)).toEqual(placeMentionMenu(anchor,container,100,viewport,'auto',6));
});
it('视口偏移、左右边界、上下边界及小视口限制',()=>{
  const view={left:20,top:30,width:200,height:100};
  const result=placeMentionMenu({...anchor,left:1000,top:-500,bottom:-480},container,200,view,'auto',6);
  expect(result).toEqual({placement:'bottom',left:-72,top:-62,width:184,maxHeight:84});
  expect(placeMentionMenu({...anchor,left:-200,top:500,bottom:520},container,200,view,'top',6)).toMatchObject({placement:'top',left:-72,top:-62,maxHeight:84});
  expect(placeMentionMenu(anchor,{...container,width:50},100,viewport,'bottom',6).width).toBe(50);
  expect(placeMentionMenu(anchor,container,100,{left:0,top:0,width:10,height:10},'auto',6)).toMatchObject({width:0,maxHeight:0});
});
it('挂载后跟随 scroll/resize/ResizeObserver/visualViewport，并清理监听',async()=>{
  const visual=new EventTarget();Object.assign(visual,{offsetLeft:0,offsetTop:0,width:800,height:600});vi.stubGlobal('visualViewport',visual);
  let callback!:ResizeObserverCallback;
  const observe=vi.fn(),unobserve=vi.fn(),disconnect=vi.fn();
  vi.stubGlobal('ResizeObserver',class{constructor(fn:ResizeObserverCallback){callback=fn;}observe=observe;unobserve=unobserve;disconnect=disconnect;});
  const wrapper=mount(MarkdownInput,{attachTo:document.body,props:{modelValue:'abc',mentionTriggers:[{source:'member',character:'@'}]}});wrappers.push(wrapper);
  const api=wrapper.vm as unknown as {openMention(s:string):void;focus():void};
  const root=wrapper.element as HTMLElement;const editor=wrapper.get('.md-input__editor').element as HTMLElement;
  vi.spyOn(root,'getBoundingClientRect').mockReturnValue(new DOMRect(100,100,400,100));vi.spyOn(root,'clientWidth','get').mockReturnValue(400);
  vi.spyOn(editor,'getBoundingClientRect').mockReturnValue(new DOMRect(100,120,380,40));
  vi.spyOn(Range.prototype,'getBoundingClientRect').mockReturnValue(new DOMRect(150,160,0,20));
  editor.focus();setSelectionOffsets(editor,3);api.openMention('member');await nextTick();await nextTick();
  const menu=wrapper.get('[role=listbox]');
  expect(menu.attributes('data-placement')).toBe('bottom');expect(menu.attributes('style')).toContain('86px');expect(menu.classes()).toContain('is-sheet');
  await wrapper.setProps({placement:'top',offset:10,mobilePlacement:'caret'});await nextTick();await nextTick();expect(menu.attributes('data-placement')).toBe('top');expect(menu.classes()).not.toContain('is-sheet');
  expect(observe).toHaveBeenCalledWith(root);expect(observe).toHaveBeenCalledWith(menu.element);
  vi.spyOn(Range.prototype,'getBoundingClientRect').mockReturnValue(new DOMRect(200,200,0,20));
  window.dispatchEvent(new Event('scroll'));await nextTick();await nextTick();expect(menu.attributes('style')).toContain('100px');
  (menu.element as HTMLElement).style.fontSize = '0px';
  window.dispatchEvent(new Event('resize'));visual.dispatchEvent(new Event('scroll'));visual.dispatchEvent(new Event('resize'));callback([],{} as ResizeObserver);await nextTick();
  await wrapper.get('button[aria-label="关闭引用"]').trigger('click');expect(unobserve).toHaveBeenCalled();
  wrapper.unmount();expect(disconnect).toHaveBeenCalled();window.dispatchEvent(new Event('resize'));visual.dispatchEvent(new Event('resize'));await nextTick();
});
it('无 ResizeObserver、无有效原始光标时回退编辑区，面板关闭后不再定位',async()=>{
  vi.stubGlobal('ResizeObserver',undefined);vi.stubGlobal('visualViewport',undefined);
  const wrapper=mount(MarkdownInput,{attachTo:document.body,props:{mentionTriggers:[{source:'member',character:'@'}]}});wrappers.push(wrapper);
  const api=wrapper.vm as unknown as {openMention(s:string):void};
  vi.spyOn(window,'getSelection').mockReturnValue(null);api.openMention('member');await nextTick();await nextTick();expect(wrapper.find('[role=listbox]').exists()).toBe(true);
  await wrapper.get('.md-input__query button').trigger('click');window.dispatchEvent(new Event('resize'));await nextTick();expect(wrapper.find('[role=listbox]').exists()).toBe(false);
});
