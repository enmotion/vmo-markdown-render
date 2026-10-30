<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { LocalTts, type LocalTtsChunk, type LocalTtsSnapshot, type LocalTtsState } from '../index';

const source = ref('你好，这是本地流式朗读测试。文字会一小段一小段地生成，收到完整句子后就开始朗读。\n英文也可以测试：Hello, this is streaming speech. 版本号 3.14 不应被句点拆开。最后这一段没有句末标点');
const voiceURI = ref('');
const rate = ref(1);
const maxChunkLength = ref(80);
const flushDelay = ref(1000);
const inputMode = ref<'append' | 'update'>('append');
const player = shallowRef<LocalTts>();
const voices = shallowRef<SpeechSynthesisVoice[]>([]);
const snapshot = ref<LocalTtsSnapshot>({ state: 'idle', bufferedText: '', currentText: '', queuedChunks: 0 });
const error = ref('');
const received = ref('');
const generating = ref(false);
const chunks = ref<(LocalTtsChunk & { done: boolean })[]>([]);
let timer: ReturnType<typeof setInterval> | undefined;
let runId = 0;
let subscriptions: (() => void)[] = [];
const active = computed(() => generating.value || ['buffering', 'speaking', 'paused'].includes(snapshot.value.state));
const canSpeak = computed(() => !!player.value?.supported && voices.value.some(voice => voiceURI.value ? voice.voiceURI === voiceURI.value : voice.lang.replace(/_/g, '-').toLowerCase() === 'zh-cn'));
const labels: Record<LocalTtsState, string> = { idle: '就绪', buffering: '接收文字 / 等待开播', speaking: '正在朗读', paused: '已暂停', ended: '本轮朗读完成', stopped: '已停止', error: '朗读失败', disposed: '已销毁' };
function clearFeed() { clearInterval(timer); timer = undefined; generating.value = false; }
function rebuild() {
  runId++; clearFeed(); subscriptions.forEach(unsubscribe => unsubscribe()); subscriptions = [];
  player.value?.dispose();
  const instance = new LocalTts({ lang: 'zh-CN', voiceURI: voiceURI.value || undefined, rate: rate.value, maxChunkLength: maxChunkLength.value, flushDelay: flushDelay.value });
  player.value = instance; snapshot.value = instance.snapshot; voices.value = instance.getVoices(); error.value = '';
  subscriptions = [
    instance.on('change', value => { snapshot.value = value; }),
    instance.on('voiceschange', value => { voices.value = value; }),
    instance.on('chunkstart', value => { chunks.value.push({ ...value, done: false }); }),
    instance.on('chunkend', value => { const chunk = chunks.value.find(item => item.index === value.index); if (chunk) chunk.done = true; }),
    instance.on('error', value => { error.value = value.message; clearFeed(); }),
  ];
}
function send(text: string) {
  received.value += text;
  if (inputMode.value === 'append') player.value!.append(text);
  else player.value!.update(received.value);
}
function finish(token: number) {
  clearFeed();
  void player.value!.finish().catch(value => { if (token === runId && value.code !== 'canceled') error.value = value.message; });
}
function start(streaming: boolean) {
  if (!canSpeak.value || !source.value.trim()) return;
  const token = ++runId;
  clearFeed(); player.value!.reset(); received.value = ''; chunks.value = []; error.value = '';
  if (!streaming) { send(source.value); finish(token); return; }
  generating.value = true;
  const characters = Array.from(source.value); let offset = 0;
  // First text arrives in the user click; later deltas emulate an LLM stream.
  send(characters.slice(offset, offset += 2).join(''));
  timer = setInterval(() => {
    if (token !== runId) return;
    send(characters.slice(offset, offset += 2).join(''));
    if (offset >= characters.length) finish(token);
  }, 60);
}
function stop() { runId++; clearFeed(); player.value?.stop(); }
watch([voiceURI, rate, maxChunkLength, flushDelay], () => { if (player.value) rebuild(); });
onMounted(rebuild);
onBeforeUnmount(() => { runId++; clearFeed(); subscriptions.forEach(unsubscribe => unsubscribe()); player.value?.dispose(); });
</script>

<template>
  <section class="tts-lab" :data-state="snapshot.state">
    <header><small>VMO / LOCAL TTS</small><h2>本地流式朗读</h2><p>使用 LocalTts 类实例接收文字，按句、长度或等待时间分段播放。声音仅来自设备上的本地合成服务。</p></header>
    <div class="tts-lab__settings">
      <label>本地声音 <select v-model="voiceURI" aria-label="本地声音" :disabled="active"><option value="">自动选择本地中文（zh-CN）</option><option v-for="voice in voices" :key="`${voice.voiceURI}:${voice.lang}`" :value="voice.voiceURI">{{ voice.name }} · {{ voice.lang }} · 本地</option></select></label>
      <button type="button" :disabled="active" @click="player?.refreshVoices()">刷新声音</button>
      <label>语速 <input v-model.number="rate" type="range" min="0.5" max="2" step="0.1" :disabled="active">{{ rate.toFixed(1) }}×</label>
      <label>每段上限 <select v-model.number="maxChunkLength" :disabled="active"><option :value="20">20 字符</option><option :value="40">40 字符</option><option :value="80">80 字符</option><option :value="160">160 字符</option></select></label>
      <label>缓冲等待 <select v-model.number="flushDelay" :disabled="active"><option :value="500">500 ms</option><option :value="1000">1000 ms</option><option :value="2000">2000 ms</option><option :value="0">仅按句和长度</option></select></label>
    </div>
    <p v-if="player && !player.supported" class="tts-lab__error">当前浏览器未提供语音合成接口。</p>
    <p v-else-if="!canSpeak" class="tts-lab__error">没有可用的指定本地声音。请在系统中安装中文语音包，或选择列表中的其他本地声音；安装后可刷新声音列表。</p>
    <label class="tts-lab__source">朗读文本<textarea v-model="source" :disabled="active" rows="5" /></label>
    <div class="tts-lab__actions">
      <label><input v-model="inputMode" type="radio" value="append" :disabled="active">append 增量片段</label>
      <label><input v-model="inputMode" type="radio" value="update" :disabled="active">update 累计全文</label>
      <button type="button" :disabled="active || !canSpeak || !source.trim()" @click="start(true)">流式朗读</button>
      <button type="button" :disabled="active || !canSpeak || !source.trim()" @click="start(false)">整段朗读</button>
      <button v-if="snapshot.state === 'paused'" type="button" @click="player?.resume()">继续朗读</button>
      <button v-else type="button" :disabled="!active" @click="player?.pause()">暂停朗读</button>
      <button type="button" :disabled="!active" @click="stop">停止朗读</button>
    </div>
    <p role="status">{{ labels[snapshot.state] }} · 已收到 {{ Array.from(received).length }} 字符 · 等待播放 {{ snapshot.queuedChunks }} 段</p>
    <p v-if="error" class="tts-lab__error" role="alert">{{ error }}</p>
    <div class="tts-lab__grid">
      <section><h3>收到的流式文本</h3><pre data-testid="tts-received">{{ received || '等待文字…' }}</pre><p class="tts-lab__buffer">缓冲：{{ snapshot.bufferedText || '（空）' }}</p></section>
      <section><h3>播放分段</h3><ol data-testid="tts-chunks"><li v-for="chunk in chunks" :key="chunk.index" :class="{ 'is-speaking': !chunk.done }"><span>{{ chunk.done ? '已读' : '正在读' }}</span> {{ chunk.text }}</li></ol></section>
    </div>
    <p class="tts-lab__note">分段之间可能有停顿，实际音色和开播速度取决于系统。此页面不生成或导出音频文件，也不会自动切换到远端声音。</p>
  </section>
</template>

<style scoped>
.tts-lab header small { color: #6265a0; letter-spacing: .16em; font-weight: 700; }
.tts-lab h2 { margin: .4rem 0; font-size: 1.8rem; }
.tts-lab header p, .tts-lab__note, .tts-lab__buffer { color: #6c7488; }
.tts-lab__settings, .tts-lab__actions { display: flex; align-items: center; flex-wrap: wrap; gap: .8rem 1rem; margin: 1.3rem 0; font-size: .9rem; }
.tts-lab label { display: inline-flex; align-items: center; gap: .4rem; }
.tts-lab button, .tts-lab select, .tts-lab input[type='number'] { padding: .5rem .7rem; border: 1px solid #d2d7e4; border-radius: .5rem; background: white; color: inherit; font: inherit; }
.tts-lab select { max-width: 23rem; }
.tts-lab input[type='number'] { width: 5rem; }
.tts-lab button { cursor: pointer; }
.tts-lab button:disabled { opacity: .45; cursor: default; }
.tts-lab .tts-lab__source { display: flex; align-items: stretch; flex-direction: column; }
.tts-lab textarea { box-sizing: border-box; width: 100%; resize: vertical; padding: 1rem; border: 1px solid #d2d7e4; border-radius: .8rem; font: inherit; line-height: 1.7; }
.tts-lab__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; }
.tts-lab__grid section { min-width: 0; padding: 1rem; background: white; border: 1px solid #dce0e9; border-radius: .8rem; }
.tts-lab h3 { margin-top: 0; font-size: 1rem; }
.tts-lab pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; line-height: 1.7; }
.tts-lab ol { padding-left: 1.5rem; line-height: 1.8; max-height: 24rem; overflow: auto; }
.tts-lab li span { font-size: .75rem; color: #6c7488; }
.tts-lab .is-speaking { color: #5054d6; font-weight: 600; }
.tts-lab__error { color: #b82e46; }
.tts-lab__note { font-size: .85rem; }
@media (max-width: 800px) {
  .tts-lab__grid { grid-template-columns: 1fr; }
  .tts-lab__settings label { min-width: 0; max-width: 100%; white-space: nowrap; }
  .tts-lab__settings label:first-child { width: 100%; }
  .tts-lab__settings select { min-width: 0; max-width: 100%; flex: 1; }
}
</style>
