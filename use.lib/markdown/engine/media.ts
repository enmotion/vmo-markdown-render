import type MarkdownIt from 'markdown-it';

/** 媒体协议 v1：Generic Directives 的单行 leaf 子集，不启用任意 HTML。 */
export function installMedia(md: MarkdownIt) {
  md.block.ruler.before('fence', 'media_directive', (state, start, _end, silent) => {
    if (state.sCount[start] - state.blkIndent >= 4) return false;
    const line = state.src.slice(state.bMarks[start] + state.tShift[start], state.eMarks[start]).trimEnd();
    // 流式修复器不能替作者补出一个可发起资源请求的指令。
    if (state.env.originalMediaLines && state.env.originalMediaLines[start]?.trim() !== line.trim()) return false;
    const open = /^::(image|audio|video)(?=\[|\{|\s|$)/.exec(line);
    if (!open) return false;
    let pos = open[0].length;
    const spaces = () => { while (/\s/.test(line[pos] ?? '') && pos < line.length) pos++; };
    spaces();
    let label = '';
    if (line[pos] === '[') {
      const begin = ++pos;
      let depth = 1;
      while (pos < line.length && depth) {
        if (line[pos] === '\\') { pos += 2; continue; }
        if (line[pos] === '[') depth++;
        if (line[pos] === ']') depth--;
        if (depth) pos++;
      }
      if (depth) return false;
      label = md.utils.unescapeAll(line.slice(begin, pos++));
      spaces();
    }
    if (line[pos++] !== '{') return false;
    const attrs: Record<string, string> = Object.create(null);
    while (pos < line.length) {
      spaces();
      if (line[pos] === '}') { pos++; break; }
      const key = /^[a-zA-Z_][\w-]*/.exec(line.slice(pos));
      if (!key) return false;
      pos += key[0].length;
      spaces();
      if (line[pos++] !== '=') return false;
      spaces();
      let value = '';
      const quote = line[pos];
      if (quote === '"' || quote === "'") {
        const begin = ++pos;
        while (pos < line.length && line[pos] !== quote) { if (line[pos] === '\\') pos++; pos++; }
        if (pos >= line.length) return false;
        value = line.slice(begin, pos++);
      } else {
        const match = /^[^\s{}"'`=<>]+/.exec(line.slice(pos));
        if (!match) return false;
        value = match[0]; pos += value.length;
      }
      attrs[key[0]] = md.utils.unescapeAll(value);
      if (pos < line.length && line[pos] !== '}' && !/\s/.test(line[pos])) return false;
    }
    if (line[pos - 1] !== '}' || line.slice(pos).trim() || !attrs.src?.trim()) return false;
    if (silent) return true;
    const token = state.push('media_directive', open[1] === 'image' ? 'img' : open[1], 0);
    token.meta = { attrs: { ...attrs, alt: label }, label };
    token.content = line;
    token.block = true;
    token.map = [start, start + 1];
    state.line = start + 1;
    return true;
  }, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
}

/** 百分比宽度，禁止 CSS 表达式、绝对尺寸和零宽度。 */
export function mediaWidth(value?: string): string {
  const width = value?.trim() ?? '';
  const number = Number(width.slice(0, -1));
  return /^(?:\d+(?:\.\d+)?|\.\d+)%$/.test(width) && number > 0 && number <= 100 ? `${number}%` : '100%';
}
