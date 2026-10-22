import type MarkdownIt from 'markdown-it';

/** 只接受数据属性，不解释 Vue 指令、事件、style 或表达式。 */
export function parseComponentAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = Object.create(null);
  const pattern = /([a-z][a-z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  for (const match of source.matchAll(pattern)) {
    const name = match[1].toLowerCase();
    if (/^(?:on|v-)/.test(name) || ['style', 'is', 'ref', 'key', 'innerhtml'].includes(name)) continue;
    attrs[name] = match[2] ?? match[3];
  }
  return attrs;
}

/** 自定义标签和公式作为独立 token，避免 HTML 字符串重新编译。 */
export function installExtensions(md: MarkdownIt, tags: ReadonlySet<string>) {
  md.inline.ruler.before('html_inline', 'business_component', (state, silent) => {
    const rest = state.src.slice(state.pos);
    const open = /^<([a-z][a-z0-9-]*)(\s+(?:[^>"']|"[^"]*"|'[^']*')*)?\s*(\/?)>/i.exec(rest);
    if (!open || !tags.has(open[1])) return false;
    const selfClosing = /\/\s*>$/.test(open[0]);
    const endTag = `</${open[1]}>`;
    const close = selfClosing ? open[0].length : rest.indexOf(endTag, open[0].length);
    // 残缺标签保持文本，不挂载，流式补全也不应制造业务请求。
    if (close < 0) return false;
    const length = selfClosing ? close : close + endTag.length;
    if (!silent) {
      const token = state.push('business_component', '', 0);
      token.meta = { tag: open[1], attrs: parseComponentAttrs(open[2] ?? '') };
      token.content = selfClosing ? '' : rest.slice(open[0].length, close);
    }
    state.pos += length;
    return true;
  });
  md.inline.ruler.before('escape', 'inline_math', (state, silent) => {
    if (state.src[state.pos] !== '$' || state.src[state.pos + 1] === '$') return false;
    if (/\s/.test(state.src[state.pos + 1] ?? ' ')) return false;
    let end = state.pos + 1;
    while ((end = state.src.indexOf('$', end)) >= 0) {
      if (state.src[end - 1] !== '\\') break;
      end++;
    }
    if (end < 0 || /\s/.test(state.src[end - 1]) || /\d/.test(state.src[end + 1] ?? '')) return false;
    if (!silent) {
      const token = state.push('math_inline', '', 0);
      token.content = state.src.slice(state.pos + 1, end);
    }
    state.pos = end + 1;
    return true;
  });
  md.block.ruler.before('fence', 'block_math', (state, start, end, silent) => {
    const first = state.src.slice(state.bMarks[start] + state.tShift[start], state.eMarks[start]);
    if (!first.startsWith('$$')) return false;
    let last = start;
    let value = first.slice(2);
    if (value.endsWith('$$')) value = value.slice(0, -2);
    else {
      let closed = false;
      while (++last < end) {
        const line = state.src.slice(state.bMarks[last] + state.tShift[last], state.eMarks[last]);
        const closing = line.indexOf('$$');
        if (closing >= 0) { value += '\n' + line.slice(0, closing); closed = true; break; }
        value += '\n' + line;
      }
      if (!closed) return false;
    }
    if (!silent) {
      const token = state.push('math_block', '', 0);
      token.content = value.trim();
      token.block = true;
      token.map = [start, last + 1];
    }
    state.line = last + 1;
    return true;
  });
}
