import { expect, it } from 'vitest';
import { matchMentionTrigger } from '../../components/markdown-input/triggers';
const triggers = [{ character: '@', source: 'member' }, { character: '#', source: 'knowledge' }];
it('严格半角空格边界、单个字符及分类映射，代码和旧正文不触发', () => {
  expect(matchMentionTrigger('@', '你好 ', triggers)?.source).toBe('member');
  expect(matchMentionTrigger('#', '你好 ', triggers)?.source).toBe('knowledge');
  for (const before of ['', '你好', '\n', '\t', '　', '`代码 ', '```ts\n ', '````ts\n```\n ', '~~~ts\n```\n ']) expect(matchMentionTrigger('@', before, triggers)).toBeUndefined();
  expect(matchMentionTrigger('@', '```ts\ncode\n```\n ', triggers)?.source).toBe('member');
  for (const data of [null, '@@', ' @', ' ', '@hello']) expect(matchMentionTrigger(data, ' ', triggers)).toBeUndefined();
  expect(matchMentionTrigger('/', ' ', triggers)).toBeUndefined();
});
