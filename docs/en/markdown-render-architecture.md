# Render architecture

The Vue component creates an instance-specific markdown-it engine, maps tokens to internal MarkdownNode values, then renders Vue VNodes. Raw HTML is not executed. Registered business tags retain their existing controlled syntax; text replacements do not re-enter Markdown parsing.

Media directives form a documented single-line Generic Directives subset. Standard images and legacy audio/video fences share the internal media node path. Resource URLs, video posters, percentage widths and native player settings are validated by the renderer. See [Media protocol](./guide/markdown#explicit-media-directives-recommended).

Mermaid, KaTeX and highlighting load asynchronously. Version checks reject stale results. Mermaid uses a serial queue and hidden, offscreen measurement containers, validates XML results and preserves the old diagram during theme-only updates. Theme/base colors and content font caps are shared with Input.

See the [Chinese architecture details](../markdown-render-architecture), [public API](./api/markdown-render) and [testing boundaries](./guide/testing). The parser remains a full-document parser, not a claim of true incremental parsing.


Built-in standard/directive images share nodes/image.ts. Internal image-preview modules coordinate a single body-teleported overlay across Render instances, focus/scroll cleanup, gestures and explicit downloads. Those components and injection keys are internal; consumers configure imagePreview through the public Render prop.

SpeechInput delegates recognition/state/pack checks to its composable and captures optional microphone levels separately. SpeechWave only renders supplied levels. LocalTts manages plain-text segmentation, local synthesis and channel ownership as a class. The host coordinates insertion, sending, network cancellation and Markdown-to-speech extraction; these modules do not automatically connect their workflows. See [speech input](./guide/speech-input) and [TTS](./guide/local-tts).
