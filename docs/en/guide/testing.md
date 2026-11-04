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
| e2e/docs-input.browser.ts | Runs documentation examples: candidate modes, event/keyboard/send contracts and HTTP debounce/retry |
| e2e/input.browser.ts | Editing, mentions, composition events, sending, popovers, mobile layout and i18n |
| e2e/renderer.browser.ts | Markdown, media, themes, typography, Mermaid, dragging and fallbacks |
| e2e/theme.browser.ts | Opaque color steps, instance isolation, font caps and wide diagram scaling |
| e2e/mermaid-lifecycle.browser.ts | Temporary SVG isolation during drawing, page dimensions/scroll, old diagrams and cleanup |
| e2e/media.browser.ts | Standard/advanced images, real media metadata, percentage/aspect-ratio layout and source changes |
| e2e/speech-input.browser.ts | Slot controls, held keys/pointers, cancellation, hints, metered Canvas and stream release (mock speech/capture) |
| e2e/tts.browser.ts | Incremental/cumulative input, local voice filtering, pause/resume/stop and failures (mock synthesis) |
| e2e/image-preview.browser.ts | Overlay layout, themes, focus/scroll, wheel/pan, touch gestures, percentage display, right-click/hold suppression, cleanup and preserving Mermaid |

Media-specific fixtures generate SVG, WebM and WAV locally; the demo's MDN media still uses the network. Browser layout and visibility assertions complement happy-dom/mocked unit tests. Theme assertions follow configured instance colors, with separate default/custom-palette checks.

## Documentation and compatibility boundaries

The docs:links command checks built local files and anchors, including locale switches and raw prompt downloads. It does not check external URLs. Use the same DOCS_BASE for building and checking a subpath deployment.

Current browser validation uses local Chrome/Chromium. A complete Firefox/WebKit, native IME, mobile keyboard or SSR/Nuxt matrix has not been established. Runtime coverage does not establish those guarantees or exhaustively validate third-party Mermaid/KaTeX inputs. Current results are summarized in the [validation record](../markdown-render-validation).

## Manual speech and image preview checks

Speech browser tests replace recognition, microphone/audio sampling and synthesis with controlled services. They verify application state and interaction, not real recognition accuracy, sound output, installed packs, native permission dialogs or offline availability. Synthetic multi-pointer events do not establish real mobile OS gesture compatibility. Use target devices to check:

| Area | Acceptance checks |
| --- | --- |
| Recognition | HTTPS/localhost, microphone allow/deny, unavailable device, actual zh-CN/en-US recognition, installable/unavailable packs, offline local mode and embedded policy |
| Cancellation | Release before permission resolves, Escape, tab switching/window blur, disabled/unmount, no late text insertion and released microphone indicator |
| Meter/wave | Silence/speech/loud input, denied separate capture without losing dictation, reduced motion and no residual stream |
| TTS | Local voice installation/list refresh, exact language/explicit voice, user-gesture playback, real pause/resume, offline sound, stopping or replacing a network response |
| Preview | Standard/directive/linked images, narrow viewport, actual pinch/drag/long hold, right-click, Esc/menu, scroll/focus restoration, source removal |
| Mobile preview | No numeric input or automatic keyboard; read-only zoom percentage; no application hold menu or automatic download; verify native callouts on target systems |

Repeat checks for each supported browser/OS combination and record versions/results. Passing simulated speech tests does not imply all browsers provide on-device recognition or local voices. For documentation edits, run build (declarations), docs:check, docs:build and docs:links; historical test counts are dated snapshots, not a substitute for rerunning the current suites.
