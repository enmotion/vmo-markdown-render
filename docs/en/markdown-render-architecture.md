# Render architecture

The Vue component creates an instance-specific markdown-it engine, maps tokens to internal MarkdownNode values, then renders Vue VNodes. Raw HTML is not executed. Registered business tags retain their existing controlled syntax; text replacements do not re-enter Markdown parsing.

Media directives form a documented single-line Generic Directives subset. Standard images and legacy audio/video fences share the internal media node path. Resource URLs, video posters, percentage widths and native player settings are validated by the renderer. See [Media protocol](./guide/markdown#explicit-media-directives-recommended).

Mermaid, KaTeX and highlighting load asynchronously. Version checks reject stale results. Mermaid uses a serial queue and hidden, offscreen measurement containers, validates XML results and preserves the old diagram during theme-only updates. Theme/base colors and content font caps are shared with Input.

See the [Chinese architecture details](../markdown-render-architecture), [public API](./api/markdown-render) and [testing boundaries](./guide/testing). The parser remains a full-document parser, not a claim of true incremental parsing.


Built-in standard/directive images reuse the public MarkdownImage component through nodes/image.ts. use-image-preview.ts shares a host within Render and provides local hosts for standalone images; internal context coordinates one active body-teleported overlay across all instances, with focus/scroll cleanup and gestures. Thumbnail reference actions emit reference from the image and image-reference from its containing Render. Internal keys and the overlay remain private; MarkdownImage is a named package export. Context/download menus have been removed.

Initial fit reserves 50px per viewport edge and never upscales natural dimensions. That size is 100%; the default ceiling is 200%, doubling each side and quadrupling area. Pan bounds use the full viewport after zoom; resize recalculates fitting. maxScale is clamped to 1–2 and longPressDownload is a compatibility no-op. See the [standalone image API and forwarding example](./api/markdown-image).

SpeechInput delegates recognition/state/pack checks to its composable and captures optional microphone levels separately. SpeechWave only renders supplied levels. LocalTts manages plain-text segmentation, local synthesis and channel ownership as a class. The host coordinates insertion, sending, network cancellation and Markdown-to-speech extraction; these modules do not automatically connect their workflows. See [speech input](./guide/speech-input) and [TTS](./guide/local-tts).
