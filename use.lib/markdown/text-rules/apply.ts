import { h, toRaw, type VNode } from 'vue';
import type { MarkdownError, TextMatch, TextRule } from '../../../components/markdown-render/types';

function substitute(template: string, context: TextMatch): string {
  return template.replace(/\$(\$|&|\d{1,2}|<[^>]+>)/g, (literal, key: string) => {
    if (key === '$') return '$';
    if (key === '&') return context.match;
    if (key.startsWith('<')) return context.groups?.[key.slice(1, -1)] ?? '';
    const index = Number(key);
    return index > 0 && index <= context.captures.length
      ? context.captures[index - 1] ?? '' : literal;
  });
}

/**
 * 左到右选取不重叠区间。同起点仅比较数组顺序；不同起点先消费最左匹配。
 * 始终克隆正则，避免全局/粘连标记及 lastIndex 污染调用方或其他节点。
 */
export function applyTextRules(
  input: string,
  rules: readonly TextRule[],
  report: (error: MarkdownError) => void = () => {},
): string | (string | VNode)[] {
  if (input.length > 100_000 || rules.length > 100) {
    report({ stage: 'text-rule', message: '文本节点或规则数量超过处理上限，已保留原文' });
    return input;
  }
  let overflow = false;
  const candidates: { context: TextMatch; rule: TextRule; index: number }[] = [];
  rules.forEach((rule, index) => {
    if (overflow) return;
    try {
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags.replace(/[gy]/g, '') + 'g');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(input))) {
        if (!match[0].length) {
          report({ stage: 'text-rule', message: '已跳过零长度匹配', ruleIndex: index });
          break;
        }
        if (candidates.length >= 10_000) { overflow = true; break; }
        candidates.push({ rule, index, context: {
          match: match[0], captures: match.slice(1), offset: match.index, input,
          groups: match.groups,
        } });
      }
    } catch {
      report({ stage: 'text-rule', message: '正则规则无效', ruleIndex: index });
    }
  });
  if (overflow) {
    report({ stage: 'text-rule', message: '正则匹配数量超过处理上限，已保留原文' });
    return input;
  }
  candidates.sort((a, b) => a.context.offset - b.context.offset || a.index - b.index);
  let cursor = 0;
  const output: (string | VNode)[] = [];
  for (const { context, rule, index } of candidates) {
    if (context.offset < cursor) continue;
    output.push(input.slice(cursor, context.offset));
    try {
      if (rule.component) {
        const props = typeof rule.props === 'function' ? rule.props(context) : rule.props;
        output.push(h(toRaw(rule.component), { ...props, key: `${index}:${context.offset}` }));
      } else {
        output.push(typeof rule.replace === 'function'
          ? rule.replace(context) : substitute(rule.replace!, context));
      }
    } catch {
      output.push(context.match);
      report({ stage: 'text-rule', message: '文本规则回调执行失败', ruleIndex: index });
    }
    cursor = context.offset + context.match.length;
  }
  output.push(input.slice(cursor));
  return output.every(part => typeof part === 'string') ? output.join('') : output;
}
