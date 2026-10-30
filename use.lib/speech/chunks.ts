/** Extract complete sentences or bounded phrases, leaving incomplete text buffered. */
export function splitSpeechBuffer(text: string, maxLength: number, flush = false): { chunks: string[]; rest: string } {
  const chars = Array.from(text);
  const chunks: string[] = [];
  let start = 0;
  while (start < chars.length) {
    const limit = Math.min(start + maxLength, chars.length);
    let end = -1;
    for (let i = start; i < limit; i++) {
      const char = chars[i];
      // Hold a trailing dot until more text arrives, so 3. + 14 remains 3.14.
      if (/[。！？!?；;\n]/u.test(char) || char === '.' && i + 1 < chars.length && /\s/u.test(chars[i + 1])) {
        end = i + 1;
        while (end < limit && /[。！？!?…;；”’"'」』）)\]】]/u.test(chars[end])) end++;
        break;
      }
    }
    if (end < 0 && limit - start >= maxLength) {
      end = limit;
      // Prefer a phrase/word boundary instead of splitting a word at the limit.
      for (let i = limit - 1; i >= start + Math.floor(maxLength / 2); i--) {
        if (/[，,、：:\s]/u.test(chars[i])) { end = i + 1; break; }
      }
    }
    if (end < 0) {
      if (!flush) break;
      end = chars.length;
    }
    const chunk = chars.slice(start, end).join('').trim();
    if (chunk && !/^[\s”’"'」』）)\]】]+$/u.test(chunk)) chunks.push(chunk);
    start = end;
  }
  return { chunks, rest: chars.slice(start).join('') };
}
