import { expect, it } from 'vitest';
import { splitSpeechBuffer } from '../../use.lib/speech/chunks';

it('buffers partial sentences and flushes tails without requiring final punctuation', () => {
  expect(splitSpeechBuffer('你好。第二句？尾段', 80)).toEqual({ chunks: ['你好。', '第二句？'], rest: '尾段' });
  expect(splitSpeechBuffer('尾段', 80, true)).toEqual({ chunks: ['尾段'], rest: '' });
  expect(splitSpeechBuffer('你好！”下一句\n结束', 80)).toEqual({ chunks: ['你好！”', '下一句'], rest: '结束' });
});
it('keeps decimal dots and streaming word fragments buffered, splitting English at sentence boundaries', () => {
  expect(splitSpeechBuffer('版本3.', 80)).toEqual({ chunks: [], rest: '版本3.' });
  expect(splitSpeechBuffer('版本3.14。Hello world. Next', 80)).toEqual({ chunks: ['版本3.14。', 'Hello world.'], rest: ' Next' });
});
it('bounds chunks by Unicode code points and prefers word boundaries', () => {
  expect(splitSpeechBuffer('😀😀😀😀😀', 2, true).chunks).toEqual(['😀😀', '😀😀', '😀']);
  expect(splitSpeechBuffer('hello world again', 12, true).chunks).toEqual(['hello world', 'again']);
  expect(splitSpeechBuffer('   ”', 80, true).chunks).toEqual([]);
});
