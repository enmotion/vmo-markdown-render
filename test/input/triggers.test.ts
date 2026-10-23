import { expect, it } from 'vitest';
import { matchMentionTrigger } from '../../components/markdown-input/triggers';
const triggers = [{ character: '@', source: 'member' }, { character: '#', source: 'knowledge' }];
it('严格半角空格边界、单个字符及分类映射，旧正文不触发，反引号不再隔离触发', () => {
  expect(matchMentionTrigger('@', '你好 ', triggers)?.source).toBe('member');
  expect(matchMentionTrigger('#', '你好 ', triggers)?.source).toBe('knowledge');
  for (const before of ['', '你好', '\n', '\t', '　']) expect(matchMentionTrigger('@', before, triggers)).toBeUndefined();
  expect(matchMentionTrigger('@', '`代码 ', triggers)?.source).toBe('member');
  expect(matchMentionTrigger('@', '```ts\ncode\n```\n ', triggers)?.source).toBe('member');
  for (const data of [null, '@@', ' @', ' ', '@hello']) expect(matchMentionTrigger(data, ' ', triggers)).toBeUndefined();
  expect(matchMentionTrigger('/', ' ', triggers)).toBeUndefined();
});
