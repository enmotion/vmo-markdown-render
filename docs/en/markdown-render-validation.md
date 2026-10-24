# Render validation record

Updated 2026-10-24. Validation uses macOS, Node 24.14.1, Vue 3 and local Chrome/Chromium.

The full unit/component suite currently has 108 passing tests across 33 files. V8 reports 100% statements, branches, functions and lines **per runtime file**, with unchanged thresholds/exclusions. The complete browser suite passes all 47 tests across Input, Render, themes, Mermaid lifecycle and media. Evidence is recorded in the [detailed validation record](../markdown-render-validation).

See [Testing and compatibility](./guide/testing) for commands and scope. Browser tests cover media metadata and aspect ratios, standard/advanced images, percentage widths, source changes, theme inheritance, opaque color steps, font caps, wide diagram scaling and temporary SVG isolation during drawing. Unit mocks alone do not establish those browser guarantees.

Type checks, production builds, documentation example checks, site builds and built-link checks remain independent checks. No complete Firefox/WebKit, native IME, mobile keyboard or SSR/Nuxt matrix is claimed. See the [Chinese detailed record](../markdown-render-validation) for implementation evidence and historical context.
