# Speech input

`SpeechInput` is a headless controller using the browser Web Speech API. It renders only an event container and a default scoped slot. The host provides all buttons, messages, installation controls and layout. No application backend or API key is required. Wrap an editor in the slot or bind `hold` to a custom button and receive text through `result`. The example controls and error messages are in Chinese.

<script setup>
import InputSpeech from '../../examples/InputSpeech.vue';
import SpeechWavePreview from '../../examples/SpeechWavePreview.vue';
</script>

<ClientOnly><InputSpeech /></ClientOnly>

<<< ../../examples/InputSpeech.vue

## Interaction and processing

Bind `v-bind="hold"` to your button to hold and speak, releasing to stop collection. The bound button also supports Space and Enter; provide its accessible name and disabled state, and use `touch-action: none` on touch surfaces. Set `enabled` to use held Space in contenteditable areas inside the slot. Ordinary typing, IME composition, modifier shortcuts, and expanded mention menus retain their existing behavior.

Display slot `transcript` for interim previews if desired. One final `result` is emitted when the service ends; release may be followed by a processing delay. Escape, calling `cancel`, window blur, page hiding, pointer cancellation, disabling, and unmounting discard the session. Recording is limited to one minute, with startup and completion timeouts. `recording` is true only in the listening state; `busy` covers startup, listening and finalization.

The default `mode="local"` requires on-device recognition and the selected language pack. Hosts can show an install button when `availability === 'downloadable'` and call slot `install()` from its click. Local mode never automatically switches to remote recognition. Browser, OS, and language availability vary, including for `zh-CN`.

Recognition packs are stored and managed by the browser, not in the project or `node_modules`. Websites cannot choose their install path. For macOS Chrome, the default user data directory is `~/Library/Application Support/Google/Chrome`; its component system manages SODA binaries and language packs in directories such as `SODA` and `SODALanguagePacks`. Paths vary with browser/version and custom user data directories. These resources are separate from operating-system TTS voices.

The install request explicitly includes `processLocally: true`; Chrome can return false without it even for downloadable packs. Call it directly from the button's click handler to preserve user activation. Hosts can display the downloading status and call `refresh()` to check again. Native exceptions are retained in `error.cause`; the host decides how to display them. A bare false result is reported as an unexplained failure, rather than a confirmed network error. An embedding Permissions-Policy restriction has its own error code.

References: [Chrome user data directory](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/user_data_dir.md), [SODA paths](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/soda/constants.cc), [installation example](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API#checking_availability_and_installing_language_packs).

`mode="browser"` lets the browser choose its service, which may send audio to the browser vendor and require network access. The host should communicate the selected processing mode. Use HTTPS or localhost and allow microphone access. No additional ASR model is bundled.

## Keywords

Pass strings or `{ phrase, id?, boost? }` objects through `keywords`. By default this list is only used for **text matching after transcription**. The component performs substring matching with NFKC normalization, ignoring whitespace and case, and emits `keyword` once per matched configuration entry. It does not execute commands or correct transcription errors. Matching runs on-device in both recognition modes, independently of native phrase-hint support.

Experimental engine hints require an explicit `:boost-keywords="true"` opt-in (default false). Only when both `SpeechRecognition.phrases` and `SpeechRecognitionPhrase` are present is the same list submitted as hints. `boost` defaults to 5 and is clamped to 0–10. The presence of these interfaces does not prove that the selected service, model or language supports hints, or that a word will be recognized correctly.

The component distinguishes unavailable interfaces, submitted hints and rejected hints. Missing interfaces or a rejected phrase setter leave ordinary dictation available. If the service asynchronously reports `phrases-not-supported`, that session ends with an instruction to press and speak again; subsequent sessions skip hints while retaining the selected recognition mode and text keyword matching. No remote fallback occurs. Switching language/mode, refreshing, or toggling the opt-in allows another attempt.

For example, keyword `Markdown` matches transcript `mark down`; unrelated misrecognized words cannot be recovered by text matching. Neither capability is wake-word detection.

## State and host control

Recognition `state`, language-pack `availability`, and microphone `levelState` are independent.

| state | Meaning |
| --- | --- |
| checking | Capability detection on mount, refresh or language/mode changes; cannot start |
| installing | Waiting for browser installation; not recording |
| idle | No recognition task; check canStart because a pack may still be missing |
| starting | Start accepted, potentially waiting for permission; busy=true, recording=false |
| listening | Engine started; busy=true, recording=true |
| stopping | Stop requested, waiting for final results; busy=true, recording=false |
| error | Last detection/recognition failed; canStart determines whether retry is possible |

`busy` excludes checking/installing; use `canStart` for activation. Startup times out after 15 seconds, finalization after 10 seconds once started, and collection stops after 60 seconds in listening. Releasing during startup remembers the stop request and stops as soon as the engine starts.

| availability | Local-mode meaning |
| --- | --- |
| available | Language ready to start; microphone permission may still be needed |
| downloadable | Show a user-triggered install action |
| downloading | Browser reports a download; call refresh later; there is no automatic polling |
| unavailable | Language/environment currently unavailable; inspect error |
| unsupported | Recognition/local interfaces missing; inspect error |

In browser mode, available only confirms a recognition constructor, not network or language support. `refresh(): Promise<void>` cancels current recognition and rechecks capabilities without requesting recording permission. `install(): Promise<void>` only applies to local mode and returns early when disabled, checking, installing or busy. Read outcomes from slot state/error, not a boolean return value.

`enabled=false` only disables the editable-area Space entry and cancels a keyboard-held session; explicit hold buttons and start remain available. Use `disabled=true` to block and cancel recognition. `setEnabled` only emits an update; the parent must update the prop or use v-model:enabled. Binding disabled directly to busy cancels recognition immediately after starting.

`start(): boolean` reports acceptance, not microphone readiness. `stop(): void` requests finalization; receive text in result, not by awaiting stop. `cancel(): void` discards recognition; it does not cancel language-pack downloads. A normal completion emits result before keyword events. Interim values replace the entire preview; appending them duplicates text. Failed/canceled sessions never commit the interim tail.

Bind all of hold to a native button and retain that node throughout a hold. Editable-area Space only handles contenteditable descendants, not input/textarea controls or editors teleported elsewhere. The example restores editability, awaits nextTick, then inserts at the captured selection. Use a separate cancel action instead of replacing the held button.

## API

Punctuation is enabled by default. If the browser supports experimental [`unspokenPunctuation`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/unspokenPunctuation), it is enabled to request inferred commas, periods and question marks. Additionally, each final recognition segment receives a sentence terminator if it has no trailing punctuation: `。` for Chinese/Japanese, `.` for other languages. Existing punctuation is preserved, interim text is left unfinished, and English segments are separated by spaces. Set `:punctuation="false"` to disable the fallback and request native punctuation off when supported. Engine segments are not guaranteed to be sentences: a single long segment only receives a terminator at its end. Native punctuation support and accuracy vary by browser, service and language; unsupported engines need an additional punctuation restoration model for semantic punctuation.

| Prop | Type | Default |
| --- | --- | --- |
| enabled / v-model:enabled | boolean | false |
| disabled | boolean | false |
| mode | 'local' \| 'browser' | 'local' |
| lang | string | 'zh-CN' |
| punctuation | boolean | true |
| keywords | (string \| SpeechKeyword)[] | [] |
| boostKeywords | boolean | false |
| meter | boolean | false; opt in to measured microphone levels |

`enabled` controls Space in editable areas in the slot; explicit `hold` bindings work independently. Disabling cancels the session. Changing mode or language cancels recognition and refreshes capability detection.

| Event | Payload |
| --- | --- |
| update:enabled | boolean |
| start | none; startup requested, suitable for capturing an editor selection |
| interim | string; full preview, including final and interim segments |
| result | string; final transcript, emitted once after recognition ends |
| keyword | { keyword: SpeechKeyword, transcript: string } |
| state-change | 'idle' / 'checking' / 'installing' / 'starting' / 'listening' / 'stopping' / 'error' |
| error | { code: string, message: string, cause?: { name: string, message: string } } |
| level-error | SpeechInputError; separate meter error, does not cancel native recognition |

Instance methods: `start()` (returns whether startup was accepted), `stop()` (stop collection and await final recognition), `cancel()` (discard), `install()`, and `refresh()`. Instance refs also expose `state`, `recording`, `level`, `levelState` and `levelError`. Avoid mixing imperative control with keyboard or pointer control within one session.

The default slot is typed as `SpeechInputSlotProps` and receives `recording`, `state`, `busy`, `canStart`, `transcript`, `error`, `availability`, `keywordBoost`, `enabled`, `disabled`, `start`, `stop`, `cancel`, `install`, `refresh`, `setEnabled` and `hold`. `setEnabled` emits `update:enabled` for controlled `v-model:enabled` use. `keywordBoost` is `off / unavailable / ready / requested / rejected`; `ready` only confirms interface presence and `requested` only confirms submission. Keyboard activation is scoped to this component. No built-in controls, styling or messages are rendered; prior built-in UI has moved into the example's slot.

The example captures the editor selection on `start`, temporarily makes the editor read-only, and calls `insertText(text, true)` after restoring editable state. The second argument restores the captured selection. Insertion preserves mention nodes and supports undo.

With `meter` enabled, the slot also receives `level` (0–1), `levelState` (`idle / requesting / active / error`) and `levelError`. Bind `level` directly to `SpeechWave` for measured amplitude. Native speech recognition does not expose its audio track, so metering requests an additional audio-only `getUserMedia` stream and uses a Web Audio `AnalyserNode` to compute RMS. Metering runs on-device without storing/uploading audio or connecting speakers; recognition processing still follows `mode`. The normalized, smoothed -60–0 dBFS range is a visual level, not calibrated sound pressure. The Canvas draws an animated shape with measured amplitude, rather than raw audio samples.

Release, cancellation, recognition completion/failure, disabling and unmounting stop the meter and release its tracks and audio context, including streams granted after stopping. Meter failures leave level at zero, expose `levelError` and emit `level-error`; native transcription can continue independently.

## Independent Canvas waveform

`SpeechWave` takes `active`, `colors`, `level`, `height`, `speed` and `intensity`. Its level defaults to zero (silence), with no synthetic pulses. Passing a measured level from 0–1 controls its amplitude. It never captures microphone audio or requests permission itself. The speech input example above enables real metering; the independent preview below uses a manual slider instead of microphone input.

<ClientOnly><SpeechWavePreview /></ClientOnly>

<<< ../../examples/SpeechWavePreview.vue

Defaults: inactive, level 0, colors `['#6366f1', '#a855f7', '#38bdf8']`, height 56 px, speed 1 and intensity 1.5. Colors are literal Canvas color strings. Width follows the container; height is clamped to 12–320 px, speed to 0–5 and intensity to 0–3. Intensity applies soft visual gain without changing measured level or clipping peaks; zero renders a baseline. Speed zero freezes motion while retaining volume updates. For stronger, faster motion try `:intensity="2" :speed="1.5"`. The meter has fast attack and short release; the renderer applies the envelope directly without a second smoothing filter. The denser, multi-frequency shape changes quickly enough to convey speech rhythm.

When inactive it renders a static baseline. Frame loops stop when inactive, silent, at zero speed/intensity, unmounted or the page is hidden. Reduced-motion settings stop automatic movement while preserving amplitude updates. Backing resolution follows device pixel ratio, capped at 2.

Metering references: [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [audio samples](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatTimeDomainData), [releasing tracks](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/stop).

References: [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [on-device recognition](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API#on-device_speech_recognition), [phrase hints](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/phrases). Automated tests simulate the recognition service; real microphone access, accuracy, and offline availability require testing in the target browser.


## Errors and troubleshooting

Errors are stored in the error slot field and emitted through error. Native exception details are optional in cause; browser recognition error codes can also pass through unchanged.

| Code | Recovery/check |
| --- | --- |
| insecure / unsupported | HTTPS/localhost and recognition constructor availability |
| local-api-unsupported | Local interfaces are missing; installing a pack cannot add those interfaces |
| local-policy-blocked | Embedding page's local recognition Permissions-Policy |
| local-unavailable | Language, pack availability and a fresh capability check |
| install-not-allowed / install-invalid-state | Call install directly from a button on the active page |
| install-invalid-language / install-failed | Language tag and cause; false alone does not identify the cause |
| not-allowed / service-not-allowed / audio-capture | Microphone/service permissions and device availability |
| network / language-not-supported | Selected service connectivity/language support; no automatic mode switch |
| no-speech | No final segment; interim preview is not a committed result |
| phrases-not-supported | Inspect keywordBoost and retry ordinary dictation |
| timeout / start-failed / stop-failed | Session ended; inspect browser/device, then retry or refresh |
| level-not-allowed / level-device-unavailable / level-capture-failed | Separate meter failures in levelError/level-error; recognition can still succeed |

A flat wave may mean meter is off, permission is pending, capture failed, or the input is silent. active=true without a positive level still draws a baseline. Meter errors clear when stopped; retain diagnostics in the level-error handler if needed. Supply literal Canvas colors; container-scoped CSS variables are not resolved by Canvas. The Canvas is decorative; accessible status messages belong to the host.

Keyboard scopes are isolated, but SpeechInput does not lock recognition across instances; coordinate multiple recording controls. SpeechInput, LocalTts and Render do not automatically send transcripts or read responses. For a conversational flow, stop host-owned TTS before starting recognition so speaker output does not enter the microphone.

Call speech methods after browser mounting; SSR has no recognition/microphone capability. Built-in errors currently use Chinese text and there is no i18n prop; map error.code to host messages for localization. See [public types](../api/types#speech-input-and-waveform-types) and [manual acceptance checks](./testing#manual-speech-and-image-preview-checks).
