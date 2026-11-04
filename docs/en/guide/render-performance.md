# Render performance benchmark

Measured on 2026-11-03 using an Apple M2 (8 cores, 24 GiB RAM), macOS arm64 and Chrome 156.0.8078.80. The component implementation is based on `edaef85`; this change adds benchmark tooling without changing component behavior. Both normal CPU and Chrome 4× CPU slowdown runs passed readiness and error checks.

## Reproduce

```bash
npx playwright install chromium
npm run test:perf
PERF_CPU_RATE=4 npm run test:perf

# Alternatively, use a local Chrome installation on macOS
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:perf
```

The command typechecks the benchmark, builds a standalone production fixture and runs one Playwright worker against a local preview server on port 1981. The viewport is 1440 × 1000 and the content width is 960px. This suite runs separately from ordinary browser regression tests.

Reports are written to `test-results/render-performance-1x.json` and `test-results/render-performance-4x.json`, and attached to Playwright results. These generated files are ignored by Git; subsequent runs overwrite the report for that CPU rate.

## Measurement

`commitMs` measures props assignment through Vue `nextTick` and forced layout, including synchronous parsing, VNode creation and DOM updates. It does not measure completed pixel painting. `frameReadyMs` adds two animation frame callbacks and must not be interpreted as actual FPS or dropped frames.

Plain content receives component warm-up, followed by 20 parsing samples and 7 mount samples per size. Mount results below use P50; seven samples are insufficient to characterize tail latency. Each streaming scenario uses 60 cumulative updates with `streaming=true`, waiting for completion and two animation frames between updates, then finalizing with `streaming=false`. This does not simulate a fixed-rate network stream or queued updates.

## Plain document mounts

The synthetic document repeats Chinese prose, headings, emphasis, links, inline code, lists, blockquotes and tables. Length means JavaScript string length, not UTF-8 bytes. Its relatively dense structure matters as well as its length.

| Characters | DOM elements | Parse P50 | Mount + layout P50 | Mount + layout P50, 4× slowdown |
| --- | ---: | ---: | ---: | ---: |
| 10,000 | 1,371 | 1.1ms | 8.5ms | 31.6ms |
| 50,000 | 6,860 | 4.6ms | 32.9ms | 130.5ms |
| 200,000 | 27,451 | 19.6ms | 122.1ms | 549.9ms |
| 500,000 | 68,630 | 50.4ms | 316.7ms | 1,340.9ms |

Parsing and mounting are sampled separately. Subtracting their medians is not an exact phase profile, but parser-only timing clearly understates the overall cost for these large documents.

## Streaming updates

Tail append scenarios start with the full base document and add seven more characters per update, plus a seven-character prefix. Growing content increases from empty to its target length over 60 updates.

| Scenario | Commit P50 | Commit P95 | Maximum | Commit P95, 4× slowdown |
| --- | ---: | ---: | ---: | ---: |
| Append to 50,000-character base | 11.1ms | 11.5ms | 12.6ms | 40.3ms |
| Append to 200,000-character base | 38.9ms | 44.8ms | 134.4ms | 193.5ms |
| Grow to 50,000 characters | 8.0ms | 11.7ms | 22.2ms | 39.4ms |

All 60 updates on the 200,000-character base exceeded 16.7ms at normal CPU speed; three exceeded 50ms. At 4× slowdown, all 60 exceeded 50ms. These are commit-duration thresholds, not measured dropped-frame counts. Finalization cost was approximately 9.6ms for the 50,000-character base and 30.5ms for the 200,000-character base, increasing to 30.1ms and 130.9ms with slowdown.

## Enhanced content and multiple instances

Readiness waits for every target block, loaded fonts, layout and two animation frames. Each cold/warm result is a single observation. Cold means the first invocation of that enhancement type in the page, including local resource loading; it is not an internet cold-start measurement.

| Content | Cold readiness | Warm readiness | Cold / warm, 4× slowdown |
| --- | ---: | ---: | ---: |
| 100 two-line TypeScript code blocks | 66.7ms | 66.6ms | 107.3 / 67.6ms |
| 100 summation formulas | 99.3ms | 66.6ms | 365.7 / 232.6ms |
| 20 Mermaid diagrams, three nodes each | 333.3ms | 266.7ms | 1,365.9 / 1,249.6ms |

Mounting 20 Render instances with 10,000 characters each produced 27,420 DOM elements and took 125.4ms to commit, or 546.3ms with slowdown. No component errors or browser exceptions were observed.

## Lifecycle and interpretation

After warming the same lifecycle, 20 mount/unmount cycles of a 50,000-character document retained 15,628 additional JS heap bytes after forced GC, or 39,600 bytes with slowdown. DOM nodes returned to 118 and JS event listeners to 14 in both runs. This short plain-document test showed no obvious accumulation; it does not prove leak freedom or cover repeated media, preview and enhancement interactions.

The measured pressure points are large documents, frequent updates on a large base and many diagrams. Source inspection shows that each engine call processes the complete input, and Render recursively creates VNodes for the resulting document. Candidate improvements are batching streaming updates, caching completed blocks while preserving syntax boundaries, reducing live DOM through segmentation or virtualization, and deferring offscreen enhancements. No optimization or benefit claim has been implemented or verified here.

CPU slowdown is a sensitivity test, not a specific mobile device benchmark. Custom components, text rules, remote media downloads/decoding, other browsers and long-running sessions were not measured. Timings are recorded as baselines rather than machine-dependent CI pass/fail limits. The [Chinese report](/guide/render-performance) contains the full local write-up.
