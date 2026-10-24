# Testing, coverage and compatibility

## Reproduce validation

```bash
npm ci
npm run test:coverage
npm run typecheck
npm run test:types
npm run build
npm run docs:check
npm run docs:build
npm run docs:links
npm run test:browser
```

Install Chromium with `npx playwright install chromium`, or set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to a local Chromium/Chrome executable. Playwright starts Vite automatically on port 1980.

## What 100% means

V8 coverage enforces **100% statements, branches, functions and lines per runtime file** under components, use.lib and index.ts. Only declaration files and three type-only modules are excluded; media parsing, error fallbacks and asynchronous logic remain included. The Input-only coverage command does not replace the full command.

Reports are generated in coverage/index.html, coverage/coverage-summary.json and coverage/coverage-final.json. Passing tests alone does not prove 100% coverage: inspect the coverage command exit status and report. CSS, demos, docs, build scripts and dependencies are outside this runtime metric. Type contracts and copyable documentation examples have separate checks.

## Real-browser tests

| File | Scenarios |
| --- | --- |
| e2e/input.browser.ts | Editing, mentions, composition events, sending, popovers, mobile layout and i18n |
| e2e/renderer.browser.ts | Markdown, media, themes, typography, Mermaid, dragging and fallbacks |
| e2e/theme.browser.ts | Opaque color steps, instance isolation, font caps and wide diagram scaling |
| e2e/mermaid-lifecycle.browser.ts | Temporary SVG isolation during drawing, page dimensions/scroll, old diagrams and cleanup |
| e2e/media.browser.ts | Standard/advanced images, real media metadata, percentage/aspect-ratio layout and source changes |

Media-specific fixtures generate SVG, WebM and WAV locally; the demo's MDN media still uses the network. Browser layout and visibility assertions complement happy-dom/mocked unit tests. Theme assertions follow configured instance colors, with separate default/custom-palette checks.

## Documentation and compatibility boundaries

The docs:links command checks built local files and anchors, including locale switches and raw prompt downloads. It does not check external URLs. Use the same DOCS_BASE for building and checking a subpath deployment.

Current browser validation uses local Chrome/Chromium. A complete Firefox/WebKit, native IME, mobile keyboard or SSR/Nuxt matrix has not been established. Runtime coverage does not establish those guarantees or exhaustively validate third-party Mermaid/KaTeX inputs. Current results are summarized in the [validation record](../markdown-render-validation).
