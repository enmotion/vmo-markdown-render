<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { MarkdownInput, SpeechInput, SpeechWave, type InputValue, type SpeechInputMode, type SpeechInputState, type SpeechKeywordMatch } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';

const editor = ref<InstanceType<typeof MarkdownInput>>();
const value = ref<InputValue>([]);
const enabled = ref(false);
const mode = ref<SpeechInputMode>('local');
const punctuation = ref(true);
const boostKeywords = ref(false);
const busy = ref(false);
const matches = ref<string[]>([]);
function stateChange(state: SpeechInputState) { busy.value = ['starting', 'listening', 'stopping'].includes(state); }
function start() { editor.value?.captureSelection(); matches.value = []; }
async function result(text: string) {
  busy.value = false;
  await nextTick(); // Restore editable state before inserting the final result.
  editor.value?.insertText(text, true);
}
function keyword(match: SpeechKeywordMatch) { matches.value.push(match.keyword.phrase); }
</script>

<template>
  <section class="doc-example">
    <label>识别方式
      <select v-model="mode" :disabled="busy">
        <option value="local">本地离线（需语言包）</option>
        <option value="browser">浏览器服务（可能联网）</option>
      </select>
    </label>
    <label title="优先使用浏览器自动标点，缺失时按分段补句号"><input v-model="punctuation" type="checkbox" :disabled="busy">自动标点</label>
    <label><input v-model="boostKeywords" type="checkbox" :disabled="busy">热词增强（实验）</label>
    <label><input v-model="enabled" type="checkbox">空格语音模式</label>
    <SpeechInput v-slot="speech" meter :enabled="enabled" :mode="mode" :punctuation="punctuation" :boost-keywords="boostKeywords" lang="zh-CN" :keywords="['知识库', 'Markdown']"
      @start="start" @result="result" @keyword="keyword" @state-change="stateChange">
      <button v-bind="speech.hold" type="button" :disabled="!speech.canStart && !speech.busy || speech.state === 'stopping'" style="touch-action:none;user-select:none">
        {{ speech.recording ? '松开结束' : '按住说话' }}
      </button>
      <SpeechWave v-if="speech.recording" :active="speech.recording" :level="speech.level" :colors="['#6366f1', '#06b6d4']" />
      <button v-if="speech.busy" type="button" @click="speech.cancel">取消</button>
      <button v-if="mode === 'local' && speech.availability === 'downloadable'" type="button" :disabled="speech.state === 'installing'" @click="speech.install">安装语言包</button>
      <button v-if="mode === 'local'" type="button" :disabled="speech.busy || ['checking', 'installing'].includes(speech.state)" @click="speech.refresh">重新检测</button>
      <p v-if="speech.error" role="alert">{{ speech.error.message }}</p>
      <p v-if="speech.levelError" role="alert">{{ speech.levelError.message }}</p>
      <p v-if="speech.transcript">{{ speech.transcript }}</p>
      <MarkdownInput ref="editor" v-model="value" :readonly="speech.busy" />
    </SpeechInput>
    <p v-if="matches.length">关键词：{{ matches.join('、') }}</p>
    <pre>{{ value }}</pre>
  </section>
</template>
