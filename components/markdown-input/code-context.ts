/** 只用于输入辅助，不生成或渲染 Markdown；围栏按起始字符与最小长度闭合。 */
export function codeContext(text: string): { fenced: boolean; inline: boolean } {
  let fence: { char: string; length: number } | undefined;
  let inline = 0;
  for (const line of text.split('\n')) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (marker && marker[1][0] === fence.char && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      continue;
    }
    if (marker && (marker[1][0] !== '`' || !marker[2].includes('`'))) {
      fence = { char: marker[1][0], length: marker[1].length }; inline = 0; continue;
    }
    for (const match of line.matchAll(/\\.|`+/g)) {
      if (match[0][0] !== '`') continue;
      if (!inline) inline = match[0].length;
      else if (inline === match[0].length) inline = 0;
    }
  }
  return { fenced: !!fence, inline: !!inline };
}
