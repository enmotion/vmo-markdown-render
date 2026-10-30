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
| flushDelay | 1000 | Maximum buffer wait in ms; 0 disables timed flushing |
| voiceTimeout | 3000 | Timeout waiting for the selected local voice |

Options are fixed at construction. Recreate the instance to change them. `supported` only checks the browser synthesis interfaces, not voice availability.

## Methods and events

`append(delta)`, `update(fullText)`, `finish(): Promise<void>`, `pause()`, `resume()`, `stop()`, `reset()`, `dispose()`, `getVoices()`, `refreshVoices()`, `ready(): Promise<SpeechSynthesisVoice>` and `on(event, listener)` are public. `on` returns an unsubscribe function; `dispose` is idempotent and removes voice listeners. Stop/reset/dispose discard queued and buffered content and reject pending completion with `canceled`.

Events: `change(snapshot)`, `statechange(state)`, `voiceschange(voices)`, `chunkstart(chunk)`, `chunkend(chunk)`, `end`, and `error(LocalTtsError)`. Snapshots contain `state`, `bufferedText`, `currentText` and `queuedChunks`. Chunk events contain `index`, `text`, `voiceURI` and `voiceName`.

States: `idle / buffering / speaking / paused / ended / stopped / error / disposed`. Buffering includes waiting for voices or synthesis start. Error codes include `unsupported`, `voice-unavailable`, `busy`, `canceled`, `stream-closed`, `non-append-update` and native errors such as `not-allowed`. Handle `finish()` rejections, including expected cancellation.

The browser synthesis channel is shared. Class instances use exclusive ownership: another instance receives `busy` until the current stream finishes or is stopped/disposed. Stopping an idle instance does not cancel another instance. Coordinate unrelated `speechSynthesis` calls in the host as well.
