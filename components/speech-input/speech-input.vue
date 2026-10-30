<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useSpeechInput } from './use-speech-input';
import { useMicrophoneLevel } from './use-microphone-level';
import type { SpeechInputError, SpeechInputHoldBindings, SpeechInputProps, SpeechInputSlotProps, SpeechInputState, SpeechKeywordMatch } from './types';

const props = withDefaults(defineProps<SpeechInputProps>(), { enabled: false, disabled: false, lang: 'zh-CN', mode: 'local', punctuation: true, boostKeywords: false, meter: false, keywords: () => [] });
const emit = defineEmits<{
  (event: 'update:enabled', enabled: boolean): void;
  (event: 'start'): void;
  (event: 'result', transcript: string): void;
  (event: 'interim', transcript: string): void;
  (event: 'keyword', match: SpeechKeywordMatch): void;
  (event: 'state-change', state: SpeechInputState): void;
  (event: 'error', error: SpeechInputError): void;
  (event: 'level-error', error: SpeechInputError): void;
}>();
defineSlots<{ default(props: SpeechInputSlotProps): unknown }>();
const speech = useSpeechInput(props, emit);
const { state, availability, preview, error, busy, canStart, keywordBoost } = speech;
const recording = computed(() => state.value === 'listening');
const meter = useMicrophoneLevel(error => emit('level-error', error));
const { level, levelState, levelError } = meter;
const composing = ref(false);
let held: 'keyboard' | 'pointer' | undefined;
let heldKey: 'Space' | 'Enter' | undefined;
let pointerId: number | undefined;

function start() {
  const started = speech.start();
  if (started) {
    if (props.meter && (state.value === 'starting' || state.value === 'listening')) void meter.start();
    emit('start');
  }
  return started;
}
function begin(source: 'keyboard' | 'pointer') {
  if (held || !start() || !busy.value) return false;
  held = source; return true;
}
function clearHold() { held = undefined; heldKey = undefined; pointerId = undefined; }
function stop() { clearHold(); meter.stop(); speech.stop(); }
function cancel() { clearHold(); meter.stop(); speech.cancel(); }
function setEnabled(enabled: boolean) { emit('update:enabled', enabled); }
function modified(event: KeyboardEvent) { return event.isComposing || composing.value || event.keyCode === 229 || props.disabled || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey; }
function holdKeydown(event: KeyboardEvent) {
  if (modified(event) || !(event.code === 'Space' || event.key === ' ' || event.key === 'Enter')) return;
  event.preventDefault(); event.stopPropagation();
  if (!event.repeat && begin('keyboard')) heldKey = event.key === 'Enter' ? 'Enter' : 'Space';
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && (busy.value || held)) { event.preventDefault(); event.stopPropagation(); cancel(); return; }
  // A host may temporarily make its editor read-only while recognition is active.
  if (held === 'keyboard' && (event.code === heldKey || event.key === (heldKey === 'Space' ? ' ' : 'Enter'))) {
    event.preventDefault(); event.stopPropagation(); return;
  }
  if (modified(event) || !props.enabled || !(event.target instanceof HTMLElement) || !event.target.isContentEditable) return;
  if (event.code !== 'Space' && event.key !== ' ') return;
  if (event.target.closest('[role="listbox"], [aria-autocomplete="list"][aria-expanded="true"]')) return;
  holdKeydown(event);
}
function keyup(event: KeyboardEvent) {
  if (held === 'keyboard' && (event.code === heldKey || event.key === (heldKey === 'Space' ? ' ' : 'Enter'))) { event.preventDefault(); stop(); }
}
function pointerdown(event: PointerEvent) {
  if (event.button !== 0 || held || props.disabled) return;
  event.preventDefault(); begin('pointer');
  if (held === 'pointer') {
    pointerId = event.pointerId;
    try { (event.currentTarget as HTMLElement)?.setPointerCapture(event.pointerId); } catch { /* Window listeners also handle release. */ }
  }
}
function pointerup(event: PointerEvent) { if (held === 'pointer' && event.pointerId === pointerId) stop(); }
function pointercancel(event: PointerEvent) { if (held === 'pointer' && event.pointerId === pointerId) cancel(); }
function visibility() { if (document.hidden) cancel(); }
const hold: SpeechInputHoldBindings = {
  onPointerdown: pointerdown, onPointercancel: pointercancel, onLostpointercapture: pointercancel,
  onKeydown: holdKeydown, onContextmenu: event => event.preventDefault(),
};
const slotProps = computed<SpeechInputSlotProps>(() => ({
  state: state.value, recording: recording.value, busy: busy.value, canStart: canStart.value,
  level: level.value, levelState: levelState.value, levelError: levelError.value,
  enabled: props.enabled, disabled: props.disabled, transcript: preview.value, availability: availability.value,
  keywordBoost: keywordBoost.value, error: error.value,
  start, stop, cancel, install: speech.install, refresh: speech.refresh, setEnabled, hold,
}));
watch(() => props.enabled, enabled => { if (!enabled && held === 'keyboard') cancel(); });
watch(busy, value => { if (!value) clearHold(); });
watch(state, value => { if (value !== 'starting' && value !== 'listening') meter.stop(); }, { flush: 'sync' });
watch(() => props.meter, enabled => {
  if (!enabled) meter.stop();
  else if (state.value === 'starting' || state.value === 'listening') void meter.start();
});
onMounted(() => {
  window.addEventListener('keyup', keyup, true);
  window.addEventListener('pointerup', pointerup);
  window.addEventListener('pointercancel', pointercancel);
  window.addEventListener('blur', cancel);
  document.addEventListener('visibilitychange', visibility);
});
onBeforeUnmount(() => {
  window.removeEventListener('keyup', keyup, true);
  window.removeEventListener('pointerup', pointerup);
  window.removeEventListener('pointercancel', pointercancel);
  window.removeEventListener('blur', cancel);
  document.removeEventListener('visibilitychange', visibility);
});
defineExpose({ start, stop, cancel, install: speech.install, refresh: speech.refresh, state, recording, level, levelState, levelError });
</script>

<template>
  <div class="speech-input" :data-state="state" :data-recording="recording" :data-keyword-boost="keywordBoost" @keydown.capture="keydown" @compositionstart.capture="composing = true" @compositionend.capture="composing = false">
    <slot v-bind="slotProps" />
  </div>
</template>
