<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { SpeechWaveProps } from './types';

const props = withDefaults(defineProps<SpeechWaveProps>(), { active: false, level: 0, height: 56, speed: 1, intensity: 1.5, colors: () => ['#6366f1', '#a855f7', '#38bdf8'] });
const canvas = ref<HTMLCanvasElement>();
const height = computed(() => Number.isFinite(props.height) ? Math.min(320, Math.max(12, props.height)) : 56);
const colors = computed(() => {
  const values = props.colors.filter(color => typeof color === 'string' && color.trim());
  return values.length ? values : ['#6366f1', '#a855f7', '#38bdf8'];
});
let context: CanvasRenderingContext2D | null = null;
let frame: number | undefined;
let observer: ResizeObserver | undefined;
let media: MediaQueryList | undefined;
let visible = true;
let mounted = false;
let width = 0;
let ratio = 1;
let phase = 0;
let lastTime: number | undefined;
let gradient: CanvasGradient | string = '#6366f1';
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const targetLevel = computed(() => props.active && Number.isFinite(props.level) ? clamp(props.level, 0, 1) : 0);
const speed = computed(() => Number.isFinite(props.speed) ? clamp(props.speed, 0, 5) : 1);
const intensity = computed(() => Number.isFinite(props.intensity) ? clamp(props.intensity, 0, 3) : 1.5);
// A soft gain curve amplifies ordinary speech without clipping loud peaks.
const amplitude = computed(() => 1 - (1 - targetLevel.value) ** intensity.value);
function animating() { return mounted && visible && !media?.matches && context && width > 0 && amplitude.value > 0 && speed.value > 0; }
function stopFrame() { if (frame !== undefined) cancelAnimationFrame(frame); frame = undefined; lastTime = undefined; }
function paint() {
  if (!context || !canvas.value || width <= 0) return;
  const ctx = context, h = height.value;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, h);
  ctx.strokeStyle = gradient; ctx.lineCap = 'round';
  // The meter already smooths the envelope. Apply it directly here so short
  // syllables are visible immediately instead of passing through a second filter.
  for (let wave = 0; wave < 3; wave++) {
    ctx.beginPath(); ctx.lineWidth = wave === 0 ? 2 : 1.4; ctx.globalAlpha = props.active ? .85 - wave * .23 : .25;
    for (let i = 0; i <= 120; i++) {
      const x = i / 120, envelope = Math.sin(Math.PI * x) ** .85;
      const offset = wave * 1.4;
      const motion = .58 * Math.sin(x * Math.PI * (8 + wave * 1.8) - phase * (1 + wave * .17) + offset)
        + .28 * Math.sin(x * Math.PI * (17 + wave * 2) + phase * 1.9 + offset)
        + .14 * Math.sin(x * Math.PI * (31 - wave * 2) - phase * 3.1 - offset);
      const y = h / 2 + motion * envelope * amplitude.value * (h / 2 - 2);
      if (i === 0) ctx.moveTo(x * width, y); else ctx.lineTo(x * width, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function tick(time: number) {
  frame = undefined;
  if (!mounted) return;
  const elapsed = lastTime === undefined ? 16 : clamp(time - lastTime, 0, 50);
  lastTime = time;
  phase += elapsed * .018 * speed.value;
  paint();
  if (animating()) frame = requestAnimationFrame(tick);
}
function update() {
  if (!mounted) return;
  if (!animating()) { stopFrame(); paint(); }
  else if (frame === undefined) { paint(); frame = requestAnimationFrame(tick); }
}
function resize() {
  if (!canvas.value || !context) return;
  width = canvas.value.getBoundingClientRect().width;
  ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  canvas.value.width = Math.max(1, Math.round(width * ratio));
  canvas.value.height = Math.round(height.value * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (colors.value.length === 1) gradient = colors.value[0];
  else {
    const fill = context.createLinearGradient(0, 0, width, 0);
    colors.value.forEach((color, index) => {
      try { fill.addColorStop(index / (colors.value.length - 1), color); }
      catch { fill.addColorStop(index / (colors.value.length - 1), '#6366f1'); }
    });
    gradient = fill;
  }
  update();
}
function visibility() { visible = !document.hidden; update(); }
onMounted(() => {
  mounted = true; visible = !document.hidden;
  context = canvas.value?.getContext('2d') ?? null;
  media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  media?.addEventListener('change', update);
  if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(resize); observer.observe(canvas.value!); }
  window.addEventListener('resize', resize); document.addEventListener('visibilitychange', visibility);
  resize();
});
watch([height, () => colors.value.join('\u0000')], resize);
watch(() => [props.active, props.level, props.speed, props.intensity], update);
onBeforeUnmount(() => {
  mounted = false; stopFrame(); observer?.disconnect(); media?.removeEventListener('change', update);
  window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility);
});
</script>

<template>
  <canvas ref="canvas" class="speech-wave" :data-active="active" :data-level="targetLevel" :style="{ display: 'block', width: '100%', height: `${height}px` }" aria-hidden="true" />
</template>
