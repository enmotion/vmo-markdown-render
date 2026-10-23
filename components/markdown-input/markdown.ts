import MarkdownIt from 'markdown-it';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';
import type Token from 'markdown-it/lib/token.mjs';

export interface MarkdownDecoration { start: number; end: number; kind: 'strong' | 'em'; markers: [number, number][] }
interface Probe { start: number; index: number; pending: string }
interface SourcePosition { start: number; end: number }
const parser = new MarkdownIt('zero').enable(['emphasis', 'escape']);

// markdown-it 14 的 inline token 不提供源码位置。通过公开 ruler 钩子记录每次规则消费的区间，
// 配对与嵌套仍交给原有解析器；只装饰约定的行内语法，不转换 HTML、链接或媒体。
function finishProbe(state: StateInline) {
  const probe = state.env.inputProbe as Probe | undefined;
  if (!probe) return;
  const raw = state.src.slice(probe.start, state.pos);
  let cursor = probe.start;
  const tokens = state.tokens.slice(probe.index);
  if (probe.pending && tokens[0]?.type === 'text' && tokens[0].content === probe.pending) tokens.shift();
  for (const token of tokens) {
    if (/^([*_])\1*$/.test(raw) && token.type === 'text' && raw.includes(token.content)) {
      token.meta = { inputSource: { start: cursor, end: cursor + token.content.length } }; cursor += token.content.length;
    }
  }
}
parser.inline.ruler.before('text', 'input-source', state => {
  finishProbe(state);
  state.env.inputProbe = { start: state.pos, index: state.tokens.length, pending: state.pending } satisfies Probe;
  return false;
});
parser.inline.ruler2.before('balance_pairs', 'input-source-end', state => { finishProbe(state); return true; });

export function inlineDecorations(text: string): MarkdownDecoration[] {
  const result: MarkdownDecoration[] = [];
  const stack: { token: Token; position: SourcePosition }[] = [];
  for (const token of parser.parseInline(text, {})[0]?.children ?? []) {
    const position = token.meta?.inputSource as SourcePosition | undefined;
    if (!position) continue;
    if (token.nesting === 1) {
      stack.push({ token, position });
    } else if (token.nesting === -1) {
      const open = stack.pop();
      if (!open || open.token.tag !== token.tag) continue;
      const start = open.position.end - open.token.markup.length;
      const end = position.start + token.markup.length;
      const kind = token.tag as 'strong' | 'em';
      result.push({ start, end, kind, markers: [[start, start + token.markup.length], [position.start, end]] });
    }
  }
  // 编辑破坏外层包裹符号时，保留整段源码，避免把残缺粗体误呈现为斜体。
  return result.filter(item => {
    if (text[item.start] === '_') return false;
    const marker = text[item.start];
    const covered = (position: number) => result.some(other => other.markers.some(([start, end]) => position >= start && position < end));
    return !((text[item.start - 1] === marker && !covered(item.start - 1))
      || (text[item.end] === marker && !covered(item.end)));
  });
}

/** 仅识别短横线无序列表及有序列表。 */
export function linePrefix(text: string) {
  const match = /^([ \t]*)(-|\d+\.)( +)/.exec(text);
  if (!match) return;
  return { length: match[0].length, marker: match[2], kind: /^\d/.test(match[2]) ? 'ordered' : 'unordered' };
}
