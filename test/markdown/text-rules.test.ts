import { describe, expect, it } from 'vitest';
import { applyTextRules } from '../../use.lib/markdown/text-rules/apply';

describe('多正则转换规则数组', () => {
  it('处理规模超限时保留原文并报告', () => {
    const errors: unknown[] = [];
    const input = 'a'.repeat(10001);
    expect(applyTextRules(input, [{ pattern: /a/g, replace: 'b' }], error => errors.push(error))).toBe(input);
    expect(errors).toHaveLength(1);
  });
  it('同起点首条胜出，不处理转换结果，不同位置独立命中', () => {
    expect(applyTextRules('abc ORDER-12', [
      { pattern: /abc/g, replace: 'ORDER-99' },
      { pattern: /ab/g, replace: '错误' },
      { pattern: /ORDER-(\d+)/g, replace: '订单 $1' },
    ])).toBe('ORDER-99 订单 12');
  });
  it('消费最左区间并忽略重叠，保留非重叠匹配', () => {
    expect(applyTextRules('abc bc', [
      { pattern: /bc/, replace: 'B' }, { pattern: /ab/, replace: 'A' },
    ])).toBe('Ac B');
  });
  it('克隆正则且允许回调读取捕获组', () => {
    const pattern = /user:(\w+)/g;
    pattern.lastIndex = 9;
    expect(applyTextRules('user:amy user:bob', [{
      pattern, replace: ({ captures }) => captures[0]!.toUpperCase(),
    }])).toBe('AMY BOB');
    expect(pattern.lastIndex).toBe(9);
  });
  it('零长度和回调异常不破坏文本', () => {
    const errors: unknown[] = [];
    expect(applyTextRules('abc', [
      { pattern: /^/g, replace: 'x' },
      { pattern: /abc/g, replace: () => { throw Error('private data'); } },
    ], error => errors.push(error))).toBe('abc');
    expect(errors).toHaveLength(2);
    expect(JSON.stringify(errors)).not.toContain('private data');
  });
});
