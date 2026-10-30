import { expect, it } from 'vitest';
import { formatSpeechSegments } from '../../components/speech-input/transcript';

it('adds Chinese sentence boundaries and preserves punctuation, quotes and blank segments', () => {
  expect(formatSpeechSegments(['你好', '今天晴天', '出发吧！', '你说“好。”', ' ', '再见……'], 'zh-CN', true)).toBe('你好。今天晴天。出发吧！你说“好。”再见……');
  expect(formatSpeechSegments(['已经有，', '标点；', '结束。'], 'zh-TW', true)).toBe('已经有，标点；结束。');
  expect(formatSpeechSegments(['こんにちは', '元気？'], 'ja-JP', true)).toBe('こんにちは。元気？');
});
it('preserves words between English segments and respects opt-out', () => {
  expect(formatSpeechSegments(['Hello world', 'How are you?'], 'en-US', true)).toBe('Hello world. How are you?');
  expect(formatSpeechSegments(['Hello', 'world'], 'en-US', false)).toBe('Hello world');
  expect(formatSpeechSegments(['第一句话', '第二句话'], 'zh-CN', false)).toBe('第一句话第二句话');
  expect(formatSpeechSegments([], 'zh-CN', true)).toBe('');
});
