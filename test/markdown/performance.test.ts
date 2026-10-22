import { describe, expect, it } from 'vitest';
import { createEngine } from '../../use.lib/markdown/engine/parse';

describe('长文解析基线', () => {
  it('记录36,000 字符文档与 100 次追加的耗时', () => {
    const block = '## 标题\n\n正文 **强调** 与 [链接](https://example.com)。\n\n- 项目一\n- 项目二\n\n';
    const source = block.repeat(600);
    const parse = createEngine(new Set(), 'perf');
    parse(source, false); // 预热
    const start = performance.now();
    const final = parse(source, false);
    const fullMs = performance.now() - start;
    const durations: number[] = [];
    for (let index = 0; index < 100; index++) {
      const begin = performance.now();
      parse(source + `\n\n正在追加 ${'文本'.repeat(index)}`, true);
      durations.push(performance.now() - begin);
    }
    const sorted = [...durations].sort((a, b) => a - b);
    console.log(JSON.stringify({ characters: source.length, headings: final.headings.length, fullMs: +fullMs.toFixed(2), appendP50Ms: +sorted[49].toFixed(2), appendP95Ms: +sorted[94].toFixed(2) }));
    expect(final.headings).toHaveLength(600);
    // 宽松上限只检测意外退化/卡死，交互帧率由浏览器与目标设备另行评估。
    expect(Math.max(...durations)).toBeLessThan(5000);
  });
});
