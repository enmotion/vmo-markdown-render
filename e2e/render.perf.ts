import { expect, test } from '@playwright/test';
import { cpus, totalmem, platform, arch } from 'node:os';
import { mkdir, writeFile } from 'node:fs/promises';
import type { bench } from './fixtures/render-perf';

declare global { interface Window { renderBench: typeof bench } }
function summary(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (fraction: number) => +sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)].toFixed(2);
  return { samples: values.length, p50Ms: percentile(.5), p95Ms: percentile(.95), maxMs: percentile(1),
    over16_7Ms: values.filter(value => value > 1000 / 60).length, over50Ms: values.filter(value => value > 50).length };
}

test('Render production browser stress benchmark', async ({ page, browser }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const session = await page.context().newCDPSession(page);
  const cpuRate = Number(process.env.PERF_CPU_RATE || 1);
  expect(Number.isFinite(cpuRate) && cpuRate >= 1).toBe(true);
  await session.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
  await page.goto('/e2e/fixtures/render-perf.html');
  await page.waitForFunction(() => !!window.renderBench);
  const report: Record<string, unknown> = {
    environment: { date: new Date().toISOString(), browser: browser.version(), platform: platform(), arch: arch(),
      cpu: cpus()[0]?.model, cores: cpus().length, memoryGiB: +(totalmem() / 2 ** 30).toFixed(1), cpuRate,
      viewport: page.viewportSize(), production: true },
    methodology: 'commit = props assignment → Vue nextTick → forced layout; frameReady adds two rAFs, not a paint guarantee. Imports loaded before plain mounts. Samples are sequential, unpaced beyond two rAFs; stream appends use streaming=true. No network media/download benchmark.',
  };
  // Import/component/JIT warm-up is outside the ordinary mount samples.
  await page.evaluate(async () => { const b = window.renderBench; await b.update([b.prose(10_000)]); await b.clear(); });
  const mounts = [];
  for (const characters of [10_000, 50_000, 200_000, 500_000]) {
    const parse = await page.evaluate(n => window.renderBench.parse(n), characters);
    const samples = [];
    let snapshot;
    for (let iteration = 0; iteration < 7; iteration++) {
      const result = await page.evaluate(async n => {
        const b = window.renderBench; await b.clear();
        const timing = await b.update([b.prose(n)]);
        return { ...timing, ...b.snapshot() };
      }, characters);
      samples.push(result); snapshot = result;
      expect(result.errors).toEqual([]);
      expect(result.renderers).toBe(1);
      expect(result.headings).toBeGreaterThan(0);
    }
    mounts.push({ characters, elements: snapshot!.elements, parse: summary(parse),
      commit: summary(samples.map(value => value.commitMs)), frameReady: summary(samples.map(value => value.frameReadyMs)) });
    console.log('mount', JSON.stringify(mounts[mounts.length - 1]));
  }
  report.mounts = mounts;
  const streams = [];
  for (const [characters, growing] of [[50_000, false], [200_000, false], [50_000, true]] as const) {
    const result = await page.evaluate(({ characters, growing }) => window.renderBench.stream(characters, 60, growing), { characters, growing });
    expect(result.errors).toEqual([]);
    expect(result.headings).toBeGreaterThan(0);
    streams.push({ characters, growing, elements: result.elements, commit: summary(result.durations.map(value => value.commitMs)),
      frameReady: summary(result.durations.map(value => value.frameReadyMs)), finalize: result.final });
    console.log('stream', JSON.stringify(streams[streams.length - 1]));
  }
  report.streams = streams;
  const enhancements = [];
  for (const [kind, count] of [['code', 100], ['math', 100], ['mermaid', 20]] as const) {
    for (const run of ['cold', 'warm']) {
      const result = await page.evaluate(({ kind, count }) => window.renderBench.enhanced(kind, count), { kind, count });
      expect(result.errors).toEqual([]);
      expect(result.readyCount).toBe(count);
      enhancements.push({ kind, count, run, ...result });
      console.log('enhanced', JSON.stringify(enhancements[enhancements.length - 1]));
    }
  }
  report.enhancements = enhancements;
  const multi = await page.evaluate(async () => {
    const b = window.renderBench; await b.clear();
    return { ...await b.update(Array.from({ length: 20 }, () => b.prose(10_000))), ...b.snapshot() };
  });
  expect(multi.renderers).toBe(20);
  expect(multi.errors).toEqual([]);
  report.multiInstance = { count: 20, charactersPerInstance: 10_000, ...multi };
  // Warm the same lifecycle before comparing retained heap. This is a signal, not proof of leak freedom.
  await page.evaluate(async () => { const b = window.renderBench; await b.clear(); await b.update([b.prose(50_000)]); await b.clear(); });
  await session.send('HeapProfiler.collectGarbage');
  const before = await session.send('Runtime.getHeapUsage');
  const domBefore = await session.send('Memory.getDOMCounters');
  await page.evaluate(async () => {
    const b = window.renderBench;
    for (let index = 0; index < 20; index++) { await b.update([b.prose(50_000)]); await b.clear(); }
  });
  await session.send('HeapProfiler.collectGarbage');
  const after = await session.send('Runtime.getHeapUsage');
  report.lifecycle = { cycles: 20, characters: 50_000, heapBeforeBytes: before.usedSize, heapAfterBytes: after.usedSize,
    retainedDeltaBytes: after.usedSize - before.usedSize, domBefore, domAfter: await session.send('Memory.getDOMCounters') };
  expect(pageErrors).toEqual([]);
  report.pageErrors = pageErrors;
  const json = JSON.stringify(report, null, 2);
  await mkdir('test-results', { recursive: true });
  await writeFile(`test-results/render-performance-${cpuRate}x.json`, json + '\n');
  await testInfo.attach('render-performance', { body: json, contentType: 'application/json' });
  console.log('lifecycle', JSON.stringify(report.lifecycle));
});
