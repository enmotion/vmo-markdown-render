<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownInput, type InputI18n, type InputValue, type InputMentionNode, type MarkdownInputProps,
  type MentionOption, type MentionSearch, type MentionPlacement, type MentionMobilePlacement, type ThemeColors } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
import { triggers, shortcuts, optionsFor } from './input-data';

const editor = ref<InstanceType<typeof MarkdownInput>>();
const value = ref<InputValue>([{ label: '林见微', id: 'user-lin', type: 'member' }, { type: 'text', content: ' **重点**\n- 第一项' }]);
const options = ref<MentionOption[]>([]);
const theme = ref<MarkdownInputProps['theme']>('auto');
const fontSize = ref(14);
const disabled = ref(false), readonly = ref(false), unstyled = ref(false), transparent = ref(false);
const english = ref(false), overridePlaceholder = ref(false), namesOnly = ref(false);
const placement = ref<MentionPlacement>('auto');
const offset = ref(6);
const mobilePlacement = ref<MentionMobilePlacement>('bottom-sheet');
const colors: ThemeColors = { primary: '#4f46e5', warning: '#b77916', info: '#0284c7', success: '#16804a', danger: '#dc2626' };
const englishText: InputI18n = {
  placeholder: 'Ask anything…', mentionCandidates: 'References', mentionSearchLabel: 'Search references',
  mentionSearchPlaceholder: 'Search keywords', mentionClose: 'Close references', mentionHint: 'Search keywords',
  mentionLoading: 'Searching…', mentionEmpty: 'No results', removeMention: 'Remove {label}',
  getterError: 'Export failed; default conversion used', setterError: 'Import failed; strings kept as text, other invalid input cleared',
};
function search({ source }: MentionSearch) { options.value = optionsFor(source); }
function labelOnly(node: InputMentionNode) { return node.content.label; }
const sent = ref('');
</script>

<template>
  <section class="doc-example">
    <div class="doc-actions">
      <label>主题 <select v-model="theme"><option value="">跟随宿主</option><option>light</option><option>dark</option><option>auto</option></select></label>
      <label>字号 <input v-model.number="fontSize" type="range" min="10" max="24">{{ fontSize }}px</label>
      <label><input v-model="disabled" type="checkbox">禁用</label><label><input v-model="readonly" type="checkbox">只读</label>
      <label><input v-model="unstyled" type="checkbox">unstyled</label><label><input v-model="transparent" type="checkbox">透明背景</label>
      <label><input v-model="english" type="checkbox">外部英文 KV</label><label><input v-model="overridePlaceholder" type="checkbox">覆盖 placeholder</label>
      <label><input v-model="namesOnly" type="checkbox">发送时仅输出名称</label>
      <label>方向 <select v-model="placement"><option>auto</option><option>top</option><option>bottom</option></select></label>
      <label>间距 <input v-model.number="offset" type="number" min="0" max="48"></label>
      <label>移动端 <select v-model="mobilePlacement"><option>bottom-sheet</option><option>caret</option></select></label>
    </div>
    <MarkdownInput ref="editor" v-model="value" :options="options" :mention-triggers="triggers" :mention-shortcuts="shortcuts"
      :theme="theme" :font-base-size="fontSize" :theme-colors="colors" :disabled="disabled" :readonly="readonly" :unstyled="unstyled"
      :i18n="english ? englishText : undefined" :placeholder="overridePlaceholder ? '宿主指定占位符' : undefined"
      :placement="placement" :offset="offset" :mobile-placement="mobilePlacement"
      :serialize-mention="namesOnly ? labelOnly : undefined" :style="transparent ? { '--md-background': 'transparent' } : {}" @search="search" />
    <button @pointerdown="editor?.captureSelection()" @click="editor?.openMention('member')">配置后的成员候选</button>
    <button @click="sent = editor?.getText() ?? ''">获取发送文字</button>
    <pre>{{ sent }}</pre>
  </section>
</template>
