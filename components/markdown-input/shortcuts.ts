import type { MentionShortcut } from './types';

/** 精确匹配修饰键，禁止单键和 AltGraph 误触发；冲突时首条有效配置优先。 */
export function matchMentionShortcut(event: KeyboardEvent, shortcuts: readonly MentionShortcut[]) {
  if (event.repeat || event.isComposing || event.getModifierState?.('AltGraph')) return;
  return shortcuts.find(({ keys, source }) => source.trim() && keys
    && Array.from(keys.key).length === 1 && !/\s/.test(keys.key)
    && (keys.ctrl || keys.alt || keys.meta || keys.shift)
    && !!keys.ctrl === event.ctrlKey && !!keys.alt === event.altKey
    && !!keys.meta === event.metaKey && !!keys.shift === event.shiftKey
    && (keys.key.toLocaleLowerCase() === event.key.toLocaleLowerCase()
      || /^[a-z]$/i.test(keys.key) && event.code === `Key${keys.key.toUpperCase()}`
      || /^[0-9]$/.test(keys.key) && event.code === `Digit${keys.key}`));
}