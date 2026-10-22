import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import tasks from 'markdown-it-task-lists';
import { completeMarkdown } from '@markmend/core';
import type Token from 'markdown-it/lib/token.mjs';
import type { MarkdownHeading } from '../../../components/markdown-render/types';
import type { MarkdownNode } from './types';
import { installExtensions } from './extensions';

export interface ParseResult { nodes: MarkdownNode[]; headings: MarkdownHeading[] }

/** 实例级解析器，无全局组件注册状态；HTML 作为文本处理。 */
export function createEngine(tags: ReadonlySet<string>, prefix: string) {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false });
  md.use(footnote).use(tasks);
  installExtensions(md, tags);
  return (source: string, streaming: boolean): ParseResult => {
    // 禁用 HTML 自动闭合，只有原文中完整的业务标签才可挂载。
    const content = streaming ? completeMarkdown(source, { completionSteps: { html: false } }) : source;
    const headings: MarkdownHeading[] = [];
    const slugs = new Map<string, number>();
    const slug = (text: string) => {
      const base = text.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-') || 'heading';
      const count = slugs.get(base) ?? 0;
      slugs.set(base, count + 1);
      return `${prefix}-${base}${count ? '-' + count : ''}`;
    };
    const convert = (tokens: Token[], path: string): MarkdownNode[] => {
      const root: MarkdownNode[] = [];
      const stack: MarkdownNode[][] = [root];
      const push = (node: MarkdownNode) => stack[stack.length - 1].push(node);
      tokens.forEach((token, index) => {
        const key = `${path}.${index}`;
        if (token.hidden) return;
        if (token.nesting === -1) { if (stack.length > 1) stack.pop(); return; }
        if (token.type === 'inline') {
          if (token.content.trim() === '[TOC]') push({ type: 'toc', key });
          else stack[stack.length - 1].push(...convert(token.children ?? [], key));
          return;
        }
        if (token.type === 'text') { push({ type: 'text', value: token.content, key }); return; }
        if (token.type === 'business_component') {
          push({ type: 'component', tag: token.meta.tag, attrs: token.meta.attrs, value: token.content, key }); return;
        }
        if (token.type.startsWith('math_')) {
          push({ type: 'math', value: token.content, display: token.block, key }); return;
        }
        if (token.type === 'fence' || token.type === 'code_block') {
          push({ type: 'code', value: token.content, language: token.info.trim().split(/\s/)[0], key }); return;
        }
        if (token.type === 'code_inline') {
          push({ type: 'element', tag: 'code', children: [{ type: 'text', value: token.content, key: key + '.text' }], key }); return;
        }
        if (token.type === 'softbreak') { push({ type: 'text', value: '\n', key }); return; }
        if (token.type === 'hardbreak') { push({ type: 'element', tag: 'br', key }); return; }
        // task-list 插件仅生成固定 checkbox HTML，不开放通用 HTML 执行。
        if (token.type === 'html_inline' && /^<input class="task-list-item-checkbox"/.test(token.content)) {
          push({ type: 'element', tag: 'input', attrs: { type: 'checkbox', disabled: '', ...(token.content.includes('checked=""') ? { checked: '' } : {}) }, key }); return;
        }
        if (token.type === 'footnote_ref') {
          const id = `${token.meta.id}${token.meta.subId ? '-' + token.meta.subId : ''}`;
          push({ type: 'element', tag: 'sup', key, children: [{ type: 'element', tag: 'a', key: key + '.a', attrs: { href: `#${prefix}-fn-${token.meta.id}`, id: `${prefix}-ref-${id}` }, children: [{ type: 'text', value: `[${token.meta.id + 1}]`, key: key + '.t' }] }] }); return;
        }
        if (token.type === 'footnote_anchor') {
          push({ type: 'element', tag: 'a', attrs: { href: `#${prefix}-ref-${token.meta.id}${token.meta.subId ? '-' + token.meta.subId : ''}`, 'aria-label': '返回脚注引用' }, children: [{ type: 'text', value: '↩', key: key + '.t' }], key }); return;
        }
        const tag = token.type === 'footnote_block_open' ? 'section' : token.type === 'footnote_open' ? 'div' : token.tag;
        if (!tag) { if (token.content) push({ type: 'text', value: token.content, key }); return; }
        const attrs = Object.fromEntries(token.attrs ?? []);
        if (token.type === 'image') attrs.alt = token.children?.map(child => child.content).join('') ?? token.content;
        if (token.type === 'footnote_open') attrs.id = `${prefix}-fn-${token.meta.id}`;
        if (/^h[1-6]$/.test(tag)) {
          const text = tokens[index + 1]?.children?.map(t => t.content).join('') ?? '';
          attrs.id = slug(text);
          headings.push({ id: attrs.id, level: Number(tag[1]), text });
        }
        const node: MarkdownNode = { type: 'element', tag, attrs, children: [], key };
        if (token.type === 'footnote_open') node.children!.push({ type: 'element', tag: 'span', attrs: { class: 'md-footnote-number' }, key: key + '.number', children: [{ type: 'text', value: `[${token.meta.id + 1}] `, key: key + '.label' }] });
        push(node);
        if (token.nesting === 1) stack.push(node.children!);
      });
      return root;
    };
    return { nodes: convert(md.parse(content, {}), 'root'), headings };
  };
}
