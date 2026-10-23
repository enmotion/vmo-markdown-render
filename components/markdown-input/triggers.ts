import type { MentionTrigger } from './types';

/** 只判断当前直接输入，绝不扫描已有正文重新唤起。空格严格指 U+0020。 */
export function matchMentionTrigger(character: string | null, before: string, triggers: readonly MentionTrigger[], prefixes: readonly string[] = []) {
  if (!character || Array.from(character).length !== 1 || /\s/.test(character) || !before.endsWith(' ')) return;
  const binding = triggers.find(item => item.character === character && item.source.trim());
  if (binding) return binding;
  if (prefixes.includes(character)) return { character, source: undefined };
}
