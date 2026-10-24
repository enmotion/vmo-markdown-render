# Render architecture

The Vue component creates an instance-specific markdown-it engine, maps tokens to internal MarkdownNode values, then renders Vue VNodes. Raw HTML is not executed. Registered business tags retain their existing controlled syntax; text replacements do not re-enter Markdown parsing.

Media directives form a documented single-line Generic Directives subset. Standard images and legacy audio/video fences share the internal media node path. Resource URLs, video posters, percentage widths and native player settings are validated by the renderer. See [Media protocol](./guide/markdown#explicit-media-directives-recommended).

Mermaid, KaTeX and highlighting load asynchronously. Version checks reject stale results. Mermaid uses a serial queue and hidden, offscreen measurement containers, validates XML results and preserves the old diagram during theme-only updates. Theme/base colors and content font caps are shared with Input.

See the [Chinese architecture details](../markdown-render-architecture), [public API](./api/markdown-render) and [testing boundaries](./guide/testing). The parser remains a full-document parser, not a claim of true incremental parsing.
