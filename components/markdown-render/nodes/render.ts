import { h, toRaw, type VNodeChild } from 'vue';
import type { MarkdownNode } from '../../../use.lib/markdown/engine/types';
import { alerts } from '../../../use.lib/markdown/engine/alerts';
import { applyTextRules } from '../../../use.lib/markdown/text-rules/apply';
import type { MarkdownError, MarkdownHeading, MarkdownRenderProps } from '../types';
import Enhanced from './enhanced';
import MarkdownImage from './image';
import { mediaWidth } from '../../../use.lib/markdown/engine/media';
import { resolveResource } from '../resource-url';

interface RenderContext {
  props: MarkdownRenderProps;
  theme: string;
  headings: MarkdownHeading[];
  report: (error: MarkdownError) => void;
}

/** 允许相对路径和常见安全协议，拒绝控制字符混淆的脚本 URL。 */
function safeUrl(value: string): boolean {
  const normalized = value.replace(/[\u0000-\u0020\u007f]/g, '');
  return !/^[a-z][a-z\d+.-]*:/i.test(normalized) || /^(https?:|mailto:|tel:)/i.test(normalized);
}

export function renderNodes(nodes: MarkdownNode[], context: RenderContext, literal = false): VNodeChild[] {
  return nodes.map(node => {
    const children = node.children ?? [];
    if (node.type === 'text') return literal ? node.value : applyTextRules(node.value ?? '', context.props.textRules ?? [], context.report);
    if (node.type === 'component') {
      const component = context.props.components?.[node.tag!];
      return component ? h(toRaw(component), { ...node.attrs, key: node.key }, node.value ? { default: () => node.value } : undefined) : node.value;
    }
    if (node.type === 'toc') return h('nav', { key: node.key, class: 'md-toc', 'aria-label': '目录' }, [
      h('strong', '目录'),
      h('ul', context.headings.map(heading => h('li', { key: heading.id, style: { paddingInlineStart: `${heading.level - 1}em` } }, [h('a', { href: '#' + heading.id }, heading.text)]))),
    ]);
    if (node.type === 'code' || node.type === 'math') return h(Enhanced, {
      key: node.key, kind: node.type === 'math' ? 'math' : node.language === 'mermaid' ? 'mermaid' : 'code',
      value: node.value ?? '', language: node.language, display: node.display,
      theme: context.theme, pending: context.props.streaming, onError: context.report,
    });
    const tag = node.tag || 'span';
    if (tag === 'p' && children.length === 1 && ['component', 'toc'].includes(children[0].type)) {
      return renderNodes(children, context);
    }
    if (tag === 'blockquote') {
      const first = children[0];
      const text = first?.children?.[0];
      const match = text?.type === 'text' && /^\[!([A-Z]+)\][ \t]*([^\n]*)(?:\n|$)/.exec(text.value ?? '');
      const alert = match && alerts[match[1]];
      if (alert && match) {
        const rest = [{ ...first, children: [{ ...text!, value: text!.value!.slice(match[0].length) }, ...first.children!.slice(1)] }, ...children.slice(1)];
        return h('aside', { key: node.key, class: ['md-alert', `md-alert-${alert.color}`], 'data-alert': match[1].toLowerCase() }, [
          h('div', { class: 'md-alert-title' }, [h('svg', { viewBox: '0 0 24 24', width: '1em', height: '1em', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'aria-hidden': 'true', style: { display: 'inline-block', verticalAlign: '-.15em' } }, [h('path', { d: alert.icon })]), match[2].trim() || context.props.alertLabels?.[match[1]] || alert.label]),
          h('div', { class: 'md-alert-body' }, renderNodes(rest, context)),
        ]);
      }
    }
    const attrs = { ...node.attrs };
    if (['img', 'audio', 'video'].includes(tag) && attrs.src !== undefined) {
      const src = resolveResource(attrs.src, tag === 'img' ? 'image' : tag as 'audio' | 'video', context.props, context.report);
      if (src === undefined) delete attrs.src;
      else attrs.src = src;
    }
    if (tag === 'video' && attrs.poster !== undefined) {
      const poster = resolveResource(attrs.poster, 'image', context.props, context.report);
      if (poster === undefined) delete attrs.poster; else attrs.poster = poster;
    }
    for (const name of ['href', 'src', 'poster']) if (attrs[name] && !safeUrl(attrs[name])) delete attrs[name];
    if (tag === 'a' && attrs.href && !attrs.href.startsWith('#')) Object.assign(attrs, { rel: 'noopener noreferrer', target: '_blank' });
    if (tag === 'audio' || tag === 'video') {
      const mime = attrs.type && new RegExp(`^${tag}/[a-zA-Z0-9!#$&^_.+-]+$`).test(attrs.type) ? attrs.type : undefined;
      return h(tag, {
        // source 子节点动态换地址不会自动触发媒体重载，资源变化时重建播放器。
        key: `${node.key}:${attrs.src ?? ''}:${mime ?? ''}`, src: mime ? undefined : attrs.src, controls: true, preload: 'metadata',
        title: attrs.title, 'aria-label': attrs.alt || undefined,
        ...(tag === 'video' ? { playsinline: true, poster: attrs.poster,
          onLoadedmetadata: (event: Event) => {
            const video = event.currentTarget as HTMLVideoElement;
            // 封面可能有不同的宽高比，metadata 就绪后以视频本身的比例为准。
            if (video.videoWidth > 0 && video.videoHeight > 0) video.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
          },
          ...(attrs.width !== undefined ? { style: { width: mediaWidth(attrs.width), height: 'auto' } } : {}) } : {}),
        class: `md-${tag}`,
      }, [mime && attrs.src ? h('source', { src: attrs.src, type: mime }) : null, '当前浏览器不支持此媒体播放。']);
    }
    if (tag === 'img') return h(MarkdownImage, { key: node.key, src: attrs.src, alt: attrs.alt, title: attrs.title,
      width: attrs.width !== undefined ? mediaWidth(attrs.width) : undefined });
    const result = h(tag, { ...attrs, key: node.key }, renderNodes(children, context, literal || tag === 'code' || tag === 'pre'));
    return tag === 'table' ? h('div', { key: node.key, class: 'md-table-scroll' }, [result]) : result;
  });
}
