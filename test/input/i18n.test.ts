// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, reactive, ref } from 'vue';
import MarkdownInput from '../../components/markdown-input/markdown-input.vue';
import { defaultInputI18n, formatInputLabel, useInputI18n } from '../../components/markdown-input/i18n';
import { getSelectionOffsets, setSelectionOffsets } from '../../components/markdown-input/dom';
import { useInputEditor } from '../../components/markdown-input/use-editor';
import type { InputI18n, InputValue } from '../../components/markdown-input/types';
const wrappers: VueWrapper[]=[];
afterEach(()=>{wrappers.splice(0).forEach(w=>w.unmount());document.body.replaceChildren();vi.restoreAllMocks();});
const english: InputI18n = {
  placeholder:'Ask anything…', mentionCandidates:'References', mentionSearchLabel:'Search references',
  mentionSearchPlaceholder:'Search keywords', mentionClose:'Close references', mentionHint:'Search keywords',
  mentionLoading:'Searching…',mentionEmpty:'No results',removeMention:'Remove {label}',getterError:'Export failed',setterError:'Import failed',
};
const mention={label:'$& <img src=x> {label}',id:'1',type:'member'};
function setup(props = {}) {
  const wrapper=mount(MarkdownInput,{attachTo:document.body,props:{modelValue:[mention],mentionTriggers:[{character:'@',source:'member'}],...props}});wrappers.push(wrapper);
  const api=wrapper.vm as unknown as {getter():InputValue;setter(value:InputValue):void;focus():void;insertText(value:string):void;openMention(source:string):void};
  const editor=wrapper.get('.md-input__editor');
  const open=async()=>{api.openMention('member');await nextTick();await nextTick();};
  return {wrapper,api,editor,open};
}
it('中文 KV 是完整的不可变默认值，computed 部分覆盖忽略 undefined，保留空字符串', () => {
  const props=reactive<{i18n?:Partial<InputI18n>}>({}); const text=useInputI18n(props);
  expect(text.value).toEqual(defaultInputI18n); expect(Object.isFrozen(defaultInputI18n)).toBe(true);
  props.i18n={mentionEmpty:'Nothing',placeholder:undefined,mentionHint:''};
  expect(text.value.mentionEmpty).toBe('Nothing');expect(text.value.placeholder).toBe('输入消息…');expect(text.value.mentionHint).toBe('');
  props.i18n.mentionEmpty='Changed';expect(text.value.mentionEmpty).toBe('Changed');
  props.i18n=undefined;expect(text.value).toEqual(defaultInputI18n);
  expect(formatInputLabel('{label} / {label}', '$& <b>{label}</b>')).toBe('$& <b>{label}</b> / $& <b>{label}</b>');
  expect(formatInputLabel('Remove','A')).toBe('Remove');
});
it('覆盖全部界面与辅助文案，placeholder 属性优先，插值保持纯文本', async () => {
  const {wrapper,editor,api,open}=setup({i18n:english});
  expect(editor.attributes('aria-label')).toBe(english.placeholder);expect(editor.attributes('data-placeholder')).toBe(english.placeholder);
  expect(editor.get('button').attributes('aria-label')).toBe('Remove '+mention.label);expect(editor.find('img').exists()).toBe(false);
  await open();expect(wrapper.get('[role=listbox]').attributes('aria-label')).toBe(english.mentionCandidates);
  const query=wrapper.get('input');expect(query.attributes('aria-label')).toBe(english.mentionSearchLabel);expect(query.attributes('placeholder')).toBe(english.mentionSearchPlaceholder);
  expect(wrapper.get('.md-input__query button').attributes('aria-label')).toBe(english.mentionClose);
  expect(wrapper.text()).toContain('member · Search keywords');expect(wrapper.text()).toContain('No results');
  await wrapper.setProps({loading:true});expect(wrapper.get('[role=status]').text()).toBe('Searching…');
  await wrapper.setProps({placeholder:'Host prompt'});expect(editor.attributes('aria-label')).toBe('Host prompt');
  await wrapper.setProps({placeholder:''});expect(editor.attributes('data-placeholder')).toBe('');
  await wrapper.setProps({placeholder:undefined});expect(editor.attributes('data-placeholder')).toBe(english.placeholder);
  await wrapper.setProps({i18n:{placeholder:'',removeMention:''}});expect(editor.attributes('data-placeholder')).toBe('');expect(editor.get('button').attributes('aria-label')).toBe('');
  api.setter([]);expect(api.getter()).toEqual([]);
});
it('动态切换不重建编辑 DOM、不改正文选区和历史；打开的面板保留查询与焦点', async () => {
  const {wrapper,editor,api,open}=setup();
  api.focus();api.insertText('abc');
  const value=api.getter();const tag=editor.get('[data-mention]').element;const button=editor.get('button').element;
  setSelectionOffsets(editor.element as HTMLElement,2,3);const selection=getSelectionOffsets(editor.element as HTMLElement);
  await wrapper.setProps({i18n:english});
  expect(api.getter()).toEqual(value);expect(editor.get('[data-mention]').element).toBe(tag);expect(editor.get('button').element).toBe(button);
  expect(getSelectionOffsets(editor.element as HTMLElement)).toEqual(selection);expect(document.activeElement).toBe(editor.element);
  expect(button.getAttribute('aria-label')).toBe('Remove '+mention.label);
  await editor.trigger('keydown',{key:'z',ctrlKey:true});expect(api.getter()).toEqual([mention]);
  await open();const query=wrapper.get('input');await query.setValue('abc');const searchCount=wrapper.emitted('search')!.length;
  const before=api.getter();await wrapper.setProps({i18n:undefined});
  expect(wrapper.get('input').element).toBe(query.element);expect((query.element as HTMLInputElement).value).toBe('abc');expect(document.activeElement).toBe(query.element);
  expect(api.getter()).toEqual(before);expect(wrapper.emitted('search')).toHaveLength(searchCount);expect(query.attributes('aria-label')).toBe('搜索引用');
});
it('输入法期间切换文案不触碰未提交的原生文本或改变候选组词', async () => {
  const {wrapper,editor,api,open}=setup();
  api.focus();await editor.trigger('compositionstart');const pending=document.createTextNode('组词');editor.element.append(pending);
  await wrapper.setProps({i18n:english});expect(pending.parentNode).toBe(editor.element);expect(editor.get('button').attributes('aria-label')).toBe('Remove '+mention.label);
  await editor.trigger('compositionend');expect(api.getter()).toEqual([mention,{type:'text',content:'组词'}]);
  await open();const query=wrapper.get('input');await query.trigger('compositionstart');(query.element as HTMLInputElement).value='拼音';
  const count=wrapper.emitted('search')!.length;await wrapper.setProps({i18n:{...english,mentionSearchLabel:'Find'}});
  expect(document.activeElement).toBe(query.element);expect((query.element as HTMLInputElement).value).toBe('拼音');expect(wrapper.emitted('search')).toHaveLength(count);
  await query.trigger('compositionend');expect(wrapper.emitted('search')!.at(-1)![0]).toMatchObject({query:'拼音'});
});
it('错误事件读取最新文案；无挂载目标与只读状态也能安全切换', async () => {
  const {wrapper,api,editor}=setup({i18n:english,getter:()=>{throw Error();},setter:()=>{throw Error();}});
  api.getter();expect(wrapper.emitted('error')).toContainEqual([{stage:'encode',message:'Export failed'}]);
  expect(wrapper.emitted('error')).toContainEqual([{stage:'decode',message:'Import failed'}]);
  await wrapper.setProps({i18n:{setterError:'Custom import',getterError:'Custom export'}});api.setter('abc');
  expect(wrapper.emitted('error')).toContainEqual([{stage:'decode',message:'Custom import'}]);expect(wrapper.emitted('error')).toContainEqual([{stage:'encode',message:'Custom export'}]);
  await wrapper.setProps({getter:undefined,setter:undefined,readonly:true});api.setter([mention]);await wrapper.setProps({i18n:undefined});expect(editor.find('button').exists()).toBe(false);
  const props=reactive<{i18n?:Partial<InputI18n>}>({});
  const headless=mount(defineComponent({setup(){useInputEditor(props,ref(),vi.fn());return()=>h('div');}}));wrappers.push(headless);
  props.i18n=english;await nextTick();expect(headless.exists()).toBe(true);
});
it('候选自定义插槽仍由宿主翻译', async () => {
  const wrapper=mount(MarkdownInput,{attachTo:document.body,props:{i18n:english,loading:true,mentionTriggers:[{character:'@',source:'member'}]},slots:{loading:()=>h('span','Host loading'),empty:()=>h('span','Host empty'),'mention-header':()=>h('span','Host header')}});wrappers.push(wrapper);
  (wrapper.vm as unknown as {openMention(s:string):void}).openMention('member');await nextTick();await nextTick();
  expect(wrapper.text()).toContain('Host loading');expect(wrapper.text()).toContain('Host header');expect(wrapper.text()).not.toContain('Searching…');
  await wrapper.setProps({loading:false});expect(wrapper.text()).toContain('Host empty');expect(wrapper.text()).not.toContain('No results');
});
