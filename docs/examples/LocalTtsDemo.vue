<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { LocalTts, type LocalTtsState } from 'vmo-markdown-render';

const text = ref('你好，这是本地流式朗读。第一句开始播放时，后面的文字还在生成。这是没有标点的尾段');
const received = ref('');
const state = ref<LocalTtsState>('idle');
const error = ref('');
const voiceNames = ref<string[]>([]);
let tts: LocalTts | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
let run = 0;
function stop() { run++; clearInterval(timer); timer = undefined; tts?.stop(); }
function start() {
  stop(); const token = run;
  tts!.reset(); received.value = ''; error.value = '';
  const characters = Array.from(text.value); let offset = 0;
  timer = setInterval(() => {
    const delta = characters.slice(offset, offset += 2).join('');
    received.value += delta;
    tts!.append(delta); // Or use update(received.value) for cumulative text.
    if (offset >= characters.length) {
      clearInterval(timer); timer = undefined;
      void tts!.finish().catch(value => { if (token === run && value.code !== 'canceled') error.value = value.message; });
    }
  }, 60);
}
onMounted(() => {
  tts = new LocalTts({ lang: 'zh-CN', maxChunkLength: 80, flushDelay: 1000 });
  const updateVoices = () => { voiceNames.value = tts!.getVoices().filter(voice => voice.lang.toLowerCase() === 'zh-cn').map(voice => voice.name); };
  tts.on('voiceschange', updateVoices); updateVoices();
  tts.on('statechange', value => { state.value = value; });
  tts.on('error', value => { error.value = value.message; clearInterval(timer); timer = undefined; });
});
onBeforeUnmount(() => { run++; clearInterval(timer); tts?.dispose(); });
</script>

<template>
  <section class="doc-example">
    <p>本地中文声音：{{ voiceNames.join('、') || '尚无可用声音，请在系统中安装中文语音包' }}</p>
    <textarea v-model="text" aria-label="本地 TTS 测试文本" rows="3" :disabled="['buffering', 'speaking', 'paused'].includes(state)" />
    <div>
      <button :disabled="!voiceNames.length || ['buffering', 'speaking', 'paused'].includes(state)" @click="start">流式朗读</button>
      <button @click="state === 'paused' ? tts?.resume() : tts?.pause()">{{ state === 'paused' ? '继续' : '暂停' }}</button>
      <button @click="stop">停止</button>
    </div>
    <p role="status">{{ state }}</p><p v-if="error" role="alert">{{ error }}</p>
    <pre>{{ received }}</pre>
  </section>
</template>
