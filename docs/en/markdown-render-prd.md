# Render requirements and current scope

Render displays accumulated Markdown with highlighting, formulas, Mermaid, controlled business components, text rules and explicit media. It preserves source on enhancement failures and reports typed error stages. Input provides a smaller editing grammar and does not render media or injected components.

Current user-facing contracts are maintained in the [Render API](./api/markdown-render), [Input API](./api/markdown-input), [media guide](./guide/markdown) and [theme/font guide](./guide/theme). These documents take precedence over dated planning details.

The [Chinese requirements history](../markdown-render-prd) records the original design. For current evidence and limitations, use [validation](./markdown-render-validation) and [testing](./guide/testing). Browser runtime compatibility, native IME/mobile keyboards and SSR are not inferred from unit coverage.
