import { expect, it } from 'vitest';
import { matchMentionShortcut } from '../../components/markdown-input/shortcuts';
import type { MentionShortcut } from '../../components/markdown-input/types';
const shortcuts: MentionShortcut[] = [
  { source: 'knowledge', keys: { ctrl: true, key: 'k' } },
  { source: 'agent', keys: { meta: true, shift: true, key: 'J' } },
];
function event(key: string, modifiers = {}): KeyboardEvent {
  return { key, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, ...modifiers } as KeyboardEvent;
}
it('精确匹配字符、修饰键与分类，拒绝重复/输入法/单键配置', () => {
  expect(matchMentionShortcut(event('k', { ctrlKey: true }), shortcuts)?.source).toBe('knowledge');
  expect(matchMentionShortcut(event('J', { metaKey: true, shiftKey: true }), shortcuts)?.source).toBe('agent');
  for (const value of [event('k'), event('k', { ctrlKey: true, shiftKey: true }), event('k', { ctrlKey: true, repeat: true }), event('k', { ctrlKey: true, isComposing: true })]) expect(matchMentionShortcut(value, shortcuts)).toBeUndefined();
  expect(matchMentionShortcut(event('k'), [{ source: 'bad', keys: { key: 'k' } }])).toBeUndefined();
  expect(matchMentionShortcut(event('≈', { altKey: true, code: 'KeyX' }), [{ source: 'alt', keys: { key: 'x', alt: true } }])?.source).toBe('alt');
  expect(matchMentionShortcut(event('K', { shiftKey: true }), [{ source: 'shift', keys: { key: 'k', shift: true } }])?.source).toBe('shift');
  expect(matchMentionShortcut(event('k', { ctrlKey: true, getModifierState: () => true }), shortcuts)).toBeUndefined();
});
