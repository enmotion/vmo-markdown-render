import { createApp, h, nextTick, shallowRef } from 'vue';
import Render from '../../components/markdown-render/markdown-render.vue';
import { createEngine } from '../../use.lib/markdown/engine/parse';
import type { MarkdownError } from '../../components/markdown-render/types';
import '../../styles/markdown/index.css';
import 'katex/dist/katex.min.css';

const documents = shallowRef<string[]>([]);
const streaming = shallowRef(false);
const errors: MarkdownError[] = [];
const host = document.querySelector<HTMLElement>('#app')!;
createApp({
  setup: () => () => documents.value.map((content, index) => h(Render, {
    key: index, content, streaming: streaming.value, onError: (error: MarkdownError) => errors.push(error),
  })),
}).mount(host);

const block = '## 性能测试标题\n\n这是一段 Markdown 正文，包含 **加粗**、*斜体*、`inline code` 与 [链接](https://example.com)。\n\n- 第一项内容\n- 第二项内容\n\n> 引用文字。\n\n| 名称 | 数值 |\n| --- | --- |\n| 数据 | 123 |\n\n';
const prose = (characters: number) => block.repeat(Math.ceil(characters / block.length)).slice(0, characters);
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
async function present() { await frame(); await frame(); }
async function update(content: string[], isStreaming = false) {
  const start = performance.now();
  streaming.value = isStreaming;
  documents.value = content;
  await nextTick();
  // Include style/layout, not just Vue's virtual DOM work. This does not measure paint.
  void host.offsetHeight;
  const commitMs = performance.now() - start;
  await present();
  return { commitMs, frameReadyMs: performance.now() - start };
}
async function clear() { await update([]); errors.length = 0; }
function snapshot() {
  return { elements: host.querySelectorAll('*').length, headings: host.querySelectorAll('h2').length,
    renderers: host.querySelectorAll('.markdown-render').length, errors: [...errors] };
}
async function enhanced(kind: 'code' | 'math' | 'mermaid', count: number) {
  await clear();
  const source = Array.from({ length: count }, (_, index) => kind === 'code'
    ? `\n\n\`\`\`typescript\nconst value${index}: number = ${index};\nconsole.log(value${index});\n\`\`\`\n`
    : kind === 'math' ? `\n\n$$\n\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}\n$$\n`
      : `\n\n\`\`\`mermaid\ngraph LR\n A${index}[输入] --> B${index}[处理] --> C${index}[输出]\n\`\`\`\n`).join('');
  const selector = kind === 'code' ? '.hljs-keyword' : kind === 'math' ? '.katex' : '.md-mermaid svg';
  const start = performance.now();
  const timing = await update([source]);
  // Count one ready marker per block for code, because each block contains multiple keywords.
  const readyCount = () => kind === 'code'
    ? [...host.querySelectorAll('.md-code-block')].filter(node => node.querySelector(selector)).length
    : host.querySelectorAll(selector).length;
  while (readyCount() !== count && !errors.length) {
    if (performance.now() - start > 60_000) throw new Error(`${kind} enhancement timed out`);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  await document.fonts.ready;
  void host.offsetHeight;
  await present();
  return { ...timing, readyMs: performance.now() - start, characters: source.length, readyCount: readyCount(), ...snapshot() };
}

export const bench = {
  prose, clear, update, snapshot, enhanced,
  async parse(characters: number, samples = 20) {
    const source = prose(characters), parse = createEngine(new Set(), 'perf');
    parse(source, false);
    const durations: number[] = [];
    for (let index = 0; index < samples; index++) {
      const start = performance.now(); parse(source, false); durations.push(performance.now() - start);
    }
    return durations;
  },
  async stream(characters: number, steps = 60, growing = false) {
    const source = prose(characters);
    await clear();
    await update([growing ? '' : source], true);
    const durations = [];
    for (let index = 1; index <= steps; index++) {
      const content = growing ? source.slice(0, Math.ceil(source.length * index / steps))
        : source + '\n\n正在输出：' + '继续生成正文 '.repeat(index);
      durations.push(await update([content], true));
    }
    const final = await update([growing ? source : source + '\n\n正在输出：' + '继续生成正文 '.repeat(steps)], false);
    return { durations, final, ...snapshot() };
  },
};
declare global { interface Window { renderBench: typeof bench } }
window.renderBench = bench;
