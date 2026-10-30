import { onBeforeUnmount, ref } from 'vue';
import type { SpeechInputError, SpeechInputLevelState } from './types';

/** RMS mapped from -60..0 dBFS into a visual 0..1 range, not calibrated SPL. */
export function microphoneLevel(samples: Float32Array): number {
  if (!samples.length) return 0;
  let energy = 0;
  for (let i = 0; i < samples.length; i++) if (Number.isFinite(samples[i])) energy += samples[i] ** 2;
  const rms = Math.sqrt(energy / samples.length);
  return rms > 0 ? Math.min(1, Math.max(0, (20 * Math.log10(rms) + 60) / 60)) : 0;
}

interface Session {
  stream?: MediaStream;
  context?: AudioContext;
  source?: MediaStreamAudioSourceNode;
  analyser?: AnalyserNode;
  frame?: number;
}

export function useMicrophoneLevel(report: (error: SpeechInputError) => void) {
  const level = ref(0);
  const levelState = ref<SpeechInputLevelState>('idle');
  const levelError = ref<SpeechInputError>();
  let current: Session | undefined;
  function release(session: Session) {
    // stop/fail detach the current session before releasing it. That ownership
    // check also makes repeated stops and late callbacks safe without a second flag.
    if (session.frame !== undefined) cancelAnimationFrame(session.frame);
    session.stream?.getTracks().forEach(track => track.stop());
    try { session.source?.disconnect(); session.analyser?.disconnect(); } catch { /* Graph already disconnected. */ }
    if (session.context && session.context.state !== 'closed') {
      try { void session.context.close().catch(() => {}); } catch { /* Already closed. */ }
    }
  }
  function stop() {
    const session = current; current = undefined;
    if (session) release(session);
    level.value = 0; levelState.value = 'idle'; levelError.value = undefined;
  }
  async function start() {
    stop();
    const session: Session = {}; current = session;
    levelState.value = 'requesting';
    try {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context || !navigator.mediaDevices?.getUserMedia) throw new Error('当前浏览器未提供麦克风音量采样接口。');
      const context = new Context(); session.context = context;
      // Resume in the original user gesture. Handle rejection immediately, even
      // if the microphone permission prompt stays open for a long time.
      const resumed = context.state === 'suspended' ? context.resume().then(() => undefined, cause => ({ cause })) : Promise.resolve(undefined);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false }, video: false });
      if (current !== session) { stream.getTracks().forEach(track => track.stop()); return; }
      session.stream = stream;
      const resumeError = await resumed;
      if (current !== session) return;
      if (resumeError) throw resumeError.cause;
      if (context.state !== 'running') throw new Error('音量采样的 AudioContext 未能进入运行状态。');
      const analyser = context.createAnalyser(); session.analyser = analyser; analyser.fftSize = 512;
      const source = context.createMediaStreamSource(stream); session.source = source;
      source.connect(analyser); // No connection to speakers: never monitor mic audio aloud.
      const samples = new Float32Array(analyser.fftSize);
      let lastRead = -Infinity;
      const sample = (time: number) => {
        if (current !== session) return;
        try {
          if (time - lastRead >= 16) {
            const elapsed = Number.isFinite(lastRead) ? Math.min(100, time - lastRead) : 16;
            lastRead = time; analyser.getFloatTimeDomainData(samples);
            const target = microphoneLevel(samples);
            // Fast attack follows consonants; a short release preserves speech
            // rhythm. Time constants keep the response stable across refresh rates.
            const response = 1 - Math.exp(-elapsed / (target > level.value ? 8 : 40));
            const next = level.value + (target - level.value) * response;
            level.value = next < .002 ? 0 : next;
          }
          session.frame = requestAnimationFrame(sample);
        } catch (cause) { fail(session, cause); }
      };
      levelState.value = 'active'; session.frame = requestAnimationFrame(sample);
    } catch (cause) { fail(session, cause); }
  }
  function fail(session: Session, cause: unknown) {
    if (current !== session) return;
    current = undefined; release(session); level.value = 0;
    const detail = cause && typeof cause === 'object' ? cause as { name?: unknown; message?: unknown } : undefined;
    const name = typeof detail?.name === 'string' ? detail.name : 'Error';
    const message = typeof detail?.message === 'string' ? detail.message : String(cause);
    const code = name === 'NotAllowedError' ? 'level-not-allowed' : name === 'NotFoundError' || name === 'NotReadableError' ? 'level-device-unavailable' : 'level-capture-failed';
    levelError.value = { code, message: name === 'NotAllowedError' ? '麦克风音量采样被拒绝，请检查麦克风权限。' : '无法获取麦克风音量，请查看浏览器错误详情。', cause: { name, message } };
    levelState.value = 'error'; report(levelError.value);
  }
  onBeforeUnmount(stop);
  return { level, levelState, levelError, start, stop };
}
