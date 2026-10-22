import { defineComponent, h, onBeforeUnmount, ref, watch, type PropType } from 'vue';
import type { MarkdownError } from '../types';
import MermaidView from './mermaid-view';

/** 只接收本地增强库生成的 HTML；异步结果通过版本号防止覆盖新内容。 */
export default defineComponent({
  name: 'MarkdownEnhanced',
  props: {
    kind: { type: String as PropType<'code' | 'math' | 'mermaid'>, required: true },
    value: { type: String, required: true },
    language: String,
    display: Boolean,
    theme: { type: String, default: 'light' },
    pending: Boolean,
  },
  emits: { error: (_error: MarkdownError) => true },
  setup(props, { emit }) {
    const html = ref('');
    const failed = ref(false);
    const copied = ref(false);
    let version = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Mermaid 使用共享全局运行时，渲染操作排队以隔离不同主题的 initialize。
    watch(() => [props.kind, props.value, props.language, props.display, props.theme, props.pending], async () => {
      const current = ++version;
      html.value = '';
      failed.value = false;
      if (props.pending && props.kind === 'mermaid') return;
      try {
        let result: string;
        if (props.kind === 'math') {
          const { default: katex } = await import('katex');
          result = katex.renderToString(props.value, { displayMode: props.display, throwOnError: true, trust: false, strict: 'warn' });
        } else if (props.kind === 'mermaid') {
          result = await renderMermaid(props.value, props.theme === 'dark');
        } else {
          const { default: hljs } = await import('highlight.js/lib/common');
          result = props.language && hljs.getLanguage(props.language)
            ? hljs.highlight(props.value, { language: props.language, ignoreIllegals: true }).value : '';
        }
        if (version === current) html.value = result;
      } catch {
        if (version !== current) return;
        failed.value = true;
        emit('error', { stage: props.kind === 'code' ? 'highlight' : props.kind, message: '增强内容渲染失败，已保留源码' });
      }
    }, { immediate: true });
    onBeforeUnmount(() => { version++; clearTimeout(timer); });
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(props.value);
        copied.value = true;
        clearTimeout(timer);
        timer = setTimeout(() => { copied.value = false; }, 1500);
      } catch { emit('error', { stage: 'clipboard', message: '复制失败，请手动选择代码复制' }); }
    };
    return () => {
      if (props.kind === 'math' && html.value) return h(props.display ? 'div' : 'span', { class: 'md-math', innerHTML: html.value });
      if (props.kind === 'mermaid' && html.value) return h(MermaidView, { html: html.value });
      if (props.kind === 'math' && !props.display) return h('code', { class: 'md-math-source' }, props.value);
      return h('figure', { class: 'md-code-block' }, [
        h('figcaption', [h('span', props.language || props.kind), h('button', { type: 'button', onClick: copy }, copied.value ? '已复制' : '复制')]),
        failed.value ? h('small', { role: 'status' }, '渲染失败，显示源码') : null,
        h('pre', [h('code', html.value ? { innerHTML: html.value } : {}, html.value ? undefined : props.value)]),
      ]);
    };
  },
});

let mermaidQueue = Promise.resolve();
let diagramId = 0;
function renderMermaid(source: string, dark: boolean): Promise<string> {
  const result = mermaidQueue.then(async () => {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark ? 'dark' : 'default', themeVariables: { fontSize: '16px' }, suppressErrorRendering: true });
    const id = `md-diagram-${++diagramId}`;
    try {
      const { svg } = await mermaid.render(id, source);
      // SVG 内部保持 Mermaid 测量时的字号，避免 foreignObject 标签随宿主字号变化而裁切。
      // 仅通过外部字号缩放整幅图，保持文字、节点和连线的几何比例。
      const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const element = document.documentElement;
      const width = Number(element.getAttribute('viewBox')?.trim().split(/[\s,]+/)[2]);
      if (Number.isFinite(width) && width > 0) {
        element.setAttribute('style', `font-size:16px;width:calc(var(--md-font-size, 12px) * ${width / 12});max-width:100%;height:auto`);
        element.removeAttribute('width');
        element.removeAttribute('height');
      }
      return element.outerHTML;
    }
    finally { document.getElementById(`d${id}`)?.remove(); }
  });
  mermaidQueue = result.then(() => {}, () => {});
  return result;
}
