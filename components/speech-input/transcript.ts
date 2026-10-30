/** Basic segment punctuation, without claiming semantic sentence detection. */
export function formatSpeechSegments(segments: string[], lang: string, punctuation: boolean): string {
  const cjk = /^(zh|ja)(-|$)/i.test(lang);
  const terminator = cjk ? '。' : '.';
  const parts = segments.map(segment => {
    const text = segment.trim();
    if (!text || !punctuation || /[.!?。！？…；;：:，,、][”’"'）)\]】」』]*$/u.test(text)) return text;
    return text + terminator;
  }).filter(Boolean);
  return parts.join(cjk ? '' : ' ');
}
