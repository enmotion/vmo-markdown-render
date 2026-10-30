# Local streaming TTS: LocalTts

`LocalTts` is an instantiable TypeScript class whose core does not depend on Vue components. It uses browser `speechSynthesis` and only selects voices with `localService === true`. Missing local voices cause an error; remote voices are never an automatic fallback. Install system voice packs as needed and verify offline behavior in the target browser.

```ts
import { LocalTts } from 'vmo-markdown-render';

const tts = new LocalTts({ lang: 'en-US', rate: 1 });
tts.on('error', error => console.error(error.code, error.message));
// Start through a user action, such as a button click.
tts.append('Hello, this is a sentence. ');
tts.append('This is the unpunctuated tail');
await tts.finish();
tts.reset(); // Before the next message.
tts.append('Another message.');
await tts.finish();
tts.dispose();
```

Automatic voice selection requires an exact language match, ignoring case and underscore/hyphen differences. An explicit `voiceURI` selects a local voice from the list instead; the utterance language follows that voice. Initial voice lists may be empty: `voiceschanged` updates them, and `ready()` can wait for the required voice.

## Try it

Open the development app's “本地 TTS” tab or `/?view=tts` for the full voice/rate/stream controls and segment log. A compact example follows; its controls are in Chinese.

<script setup>
import LocalTtsDemo from '../../examples/LocalTtsDemo.vue';
</script>

<ClientOnly><LocalTtsDemo /></ClientOnly>

<<< ../../examples/LocalTtsDemo.vue

## Streaming input

Use either `append(delta)` for new fragments or `update(fullText)` for cumulative text within one run. Repeated cumulative text does not replay anything. Cumulative updates must extend the prior text: rewriting or shortening it throws `non-append-update`. Mixing input methods throws `input-mode`.

Complete sentences are extracted at strong punctuation/newlines or an English period followed by whitespace. A trailing period is buffered to avoid splitting `3.` + `14`. Long text is bounded by Unicode code point count, preferring word/phrase boundaries. Unpunctuated text waits at most `flushDelay`; new tokens do not indefinitely postpone flushing. `finish()` flushes the tail, closes input, and resolves after playback completes. One utterance is submitted at a time.

Use `reset()` before a new message. Late chunks after stop, completion or failure do not restart playback. Pause stops playback while still accepting and segmenting new text. Use plain text; the host should extract prose from Markdown if needed. Segment gaps, prosody and startup timing depend on the system synthesizer. This class does not expose audio files or PCM streams.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| lang | 'zh-CN' | Automatic voice language |
| voiceURI | undefined | Explicit local voice, overriding automatic selection |
| rate | 1 | 0.1–10; actual support depends on the voice |
| pitch | 1 | 0–2 |
| volume | 1 | 0–1 |
| maxChunkLength | 80 | Maximum Unicode code points per segment, 2–1000 |
| flushDelay | 1000 | 0–60000 ms; 0 disables timed flushing |
| voiceTimeout | 3000 | 0–60000 ms waiting for the selected local voice |

Options are fixed at construction. Recreate the instance to change them. `supported` only checks the browser synthesis interfaces, not voice availability.

## Methods and events

`append(delta)`, `update(fullText)`, `finish(): Promise<void>`, `pause()`, `resume()`, `stop()`, `reset()`, `dispose()`, `getVoices()`, `refreshVoices()`, `ready(): Promise<SpeechSynthesisVoice>` and `on(event, listener)` are public. `on` returns an unsubscribe function; `dispose` is idempotent and removes voice listeners. Stop/reset/dispose discard queued and buffered content and reject pending completion with `canceled`.

Events: `change(snapshot)`, `statechange(state)`, `voiceschange(voices)`, `chunkstart(chunk)`, `chunkend(chunk)`, `end`, and `error(LocalTtsError)`. Snapshots contain `state`, `bufferedText`, `currentText` and `queuedChunks`. Chunk events contain `index`, `text`, `voiceURI` and `voiceName`.

States: `idle / buffering / speaking / paused / ended / stopped / error / disposed`. Buffering includes waiting for voices or synthesis start. Error codes include `unsupported`, `voice-unavailable`, `busy`, `canceled`, `stream-closed`, `non-append-update` and native errors such as `not-allowed`. Handle `finish()` rejections, including expected cancellation.

The browser synthesis channel is shared. Class instances use exclusive ownership: another instance receives `busy` until the current stream finishes or is stopped/disposed. Stopping an idle instance does not cancel another instance. Coordinate unrelated `speechSynthesis` calls in the host as well.


## Lifecycle and completion

| State | Meaning |
| --- | --- |
| idle | New/reset instance with no text |
| buffering | Waiting for a segment, voice, synthesizer start, or more input; not necessarily audible |
| speaking | The current utterance emitted start |
| paused | Playback consumption paused; input/segmentation can continue |
| ended | finish closed input and every segment completed, including an empty stream |
| stopped | stop terminated and closed this run |
| error | Voice/channel/playback failure closed this run |
| disposed | Destroyed; create a new instance to use again |

append/update return void and offer no playback backpressure. The queue grows when generation is faster than speech, including while paused. maxChunkLength bounds each segment, not total queued/message length.

Only finish closes a normal stream. Without it, an instance can remain buffering after the final audible segment. Input closes as soon as finish is called, before ended. While paused, finish waits for resume and queue drainage. Normal completion emits end; stop/reset/dispose do not. Calling finish after ended resolves immediately, after stopped rejects with canceled, and after failure rejects with the original error.

snapshot is a plain object, not Vue reactive state. Read initial state/snapshot/getVoices, then subscribe using refs; events do not replay history. queuedChunks excludes currentText and unsegmented bufferedText. chunk.index starts at zero and resets on reset. change can repeat with the same state; statechange only reports changed values. Dispose on unmount.

## LLM stream integration and cancellation

This is a **host helper**, not another package export. Its iterator yields decoded plain-text deltas after the host has parsed its network/SSE/JSON protocol. A generation token prevents old responses from entering a new run. The caller must catch read() failures.

<<< ../../examples/read-tts-stream.ts

Create the reader after browser mounting, start reader.read(chunks) from a user action, and subscribe through reader.tts.on(...). Use reader.stop() to cancel/replace playback and reader.dispose() on unmount. Abort the original network request with a host AbortController as well: stopping speech cannot interrupt an external iterator waiting for data. This helper exits an obsolete iterator when its next fragment arrives.

For cumulative input, use update(fullText) exclusively instead of append. Render can receive cumulative Markdown while TTS receives host-extracted speech text. Do not reset/recreate the instance or finish on every token. Rewriting previous content requires stopping/resetting the run rather than a non-append update.

## Error channels and recovery

LocalTtsError is an exported Error subclass with a string code.

| Source | Delivery | Typical codes |
| --- | --- | --- |
| Invalid options/input mode/prefix, writes after closure, calls after disposal | Synchronous throw; no error event | invalid-option / input-mode / non-append-update / stream-closed / disposed |
| ready capability/voice wait | Promise rejection; an independent ready failure does not emit a playback error | unsupported / voice-unavailable / canceled |
| Queue voice selection, channel ownership, synthesis | error event and pending finish rejection | unsupported / voice-unavailable / busy / synthesis-failed / native error codes |

stop/reset/dispose reject outstanding ready/finish with canceled without emitting error for intentional cancellation. An error subscription does not replace Promise handling or synchronous try/catch. Input validation failures do not dispose the instance; playback failures require reset before new input and never automatically replay failed segments. After disposal, use only read-only access or repeated dispose.

Numeric options must be finite and within the documented ranges; construction throws invalid-option instead of clamping. maxChunkLength is floored after validation. Voice selection never falls back to another region or remote voice. ready waits for a voice, not installation, channel reservation or autoplay permission; speak can still fail with not-allowed. Retain a user-triggered playback action.

## Environment and resource boundaries

System TTS voices and ASR recognition packs are separate resources. The class does not install voices, export audio, parse SSML or provide word/phoneme timestamps. Segment-edge whitespace is trimmed and whitespace-only segments are skipped; Markdown/code/URLs are not automatically cleaned.

Construction without window is safe but supported=false; that instance does not acquire browser interfaces during hydration. Construct a fresh instance on the client. Although the class core does not depend on Vue components, the package entry still has Vue peer/build requirements; no separate Vue-free subpackage is provided.

Ownership begins when a segment is submitted. Once owned, the channel remains reserved during pauses and gaps until finish completes or stop/reset/dispose releases it. Other instances receive busy; there is no automatic wait queue or preemption. See [manual device checks](./testing#manual-speech-and-image-preview-checks) and [public types](../api/types#local-tts-types).
