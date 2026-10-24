# Input validation record

Updated 2026-10-24. Input runtime files are included in the full per-file 100% V8 coverage gate; the full library currently has 108 passing unit/component tests. Type contracts are checked separately.

Real-browser Input scenarios cover mentions, keyboard selection, serialization, sending, undo/redo, composition events, candidate filters, desktop/mobile placement, i18n, readonly/disabled behavior and source-text preservation. Shared theme tests cover opaque color steps and the content font cap. This does not establish a complete native IME, mobile keyboard or cross-browser support matrix.

See [Testing and compatibility](./guide/testing) for reproducible commands and the [current Render record](./markdown-render-validation) for complete-suite results. The [Chinese Input history](../markdown-input-validation) retains earlier snapshots; historical test counts/failures are not current claims.
