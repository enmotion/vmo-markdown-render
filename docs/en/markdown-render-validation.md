# Render validation record

Updated 2026-10-24. Validation uses macOS, Node 24.14.1, Vue 3 and local Chrome/Chromium.

The 2026-10-24 unit/component snapshot had 108 passing tests across 33 files. V8 reports 100% statements, branches, functions and lines **per runtime file**, with unchanged thresholds/exclusions. The browser snapshot passed all 47 tests across Input, Render, themes, Mermaid lifecycle and media. Evidence is recorded in the [detailed validation record](../markdown-render-validation).

See [Testing and compatibility](./guide/testing) for commands and scope. Browser tests cover media metadata and aspect ratios, standard/advanced images, percentage widths, source changes, theme inheritance, opaque color steps, font caps, wide diagram scaling and temporary SVG isolation during drawing. Unit mocks alone do not establish those browser guarantees.

Type checks, production builds, documentation example checks, site builds and built-link checks remain independent checks. No complete Firefox/WebKit, native IME, mobile keyboard or SSR/Nuxt matrix is claimed. See the [Chinese detailed record](../markdown-render-validation) for implementation evidence and historical context.


The later speech-input, TTS and image-preview suites are not included in those historical counts. The 2026-10-31 documentation audit adds their state/error/resource contracts and manual acceptance scope. Speech services are simulated in browser tests; actual permissions, recognition, local voices and offline playback require target-device checks. See [testing](./guide/testing#manual-speech-and-image-preview-checks) and the [dated detailed record](../markdown-render-validation).
