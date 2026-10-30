import type { ThemeColor, ThemeColors, TextRule } from '../components/markdown-render/types';
import { defineComponent, h } from 'vue';
import type { ImagePreviewOptions, MarkdownRenderProps } from '../components/markdown-render/types';
const previewOptions: ImagePreviewOptions = { background: { light: '#ffffff', dark: '#151821' }, maxScale: 8, longPressDownload: true };
const previewRender: MarkdownRenderProps = { imagePreview: previewOptions };
const noPreviewRender: MarkdownRenderProps = { imagePreview: false };
// @ts-expect-error Maximum zoom must be numeric.
const invalidPreview: ImagePreviewOptions = { maxScale: '8' };
void [previewRender, noPreviewRender, invalidPreview];

const colors: ThemeColors = { lightBackground: '#ffffff', darkBackground: '#151821', primary: '#112233', warning: '#11223344', info: 'rgb(1, 2, 3)', danger: 'rgba(1,2,3,0.5)' };
// @ts-expect-error Only supported base and semantic color properties are accepted.
const unknownKey: ThemeColors = { secondary: '#112233' };
// @ts-expect-error Named colors are not accepted.
const named: ThemeColor = 'red';
// @ts-expect-error CSS variable expressions are not accepted.
const variable: ThemeColor = 'var(--primary)';
// @ts-expect-error Color props do not accept numeric values.
const number: ThemeColors = { success: 123 };
const component = defineComponent({ render: () => h('span') });
const rules: TextRule[] = [
  { pattern: /a/, replace: '$&' },
  { pattern: /a/, replace: () => h(component) },
  { pattern: /a/, component, props: ({ captures }) => ({ id: captures[0] }) },
];
// @ts-expect-error A rule must choose either replace or component.
const conflicting: TextRule = { pattern: /a/, replace: 'a', component };
// @ts-expect-error A rule must supply an output.
const missing: TextRule = { pattern: /a/ };
void [colors, unknownKey, named, variable, number, rules, conflicting, missing];

import type { InputTextNode, InputMentionNode, InputValue } from '../components/markdown-input/types';
const textNode: InputTextNode = { type: 'text', content: 'hello' };
const mentionNode: InputMentionNode = { type: 'mention', content: { id: 'a', label: 'A' } };
const fullMention: InputMentionNode = { type: 'mention', content: { id: 'a', label: 'A', type: 'member', data: { extra: true } } };
const inputValue: InputValue = [textNode, { id: 'a', label: 'A' }];
// @ts-expect-error A mention must have an id.
const missingId: InputMentionNode = { type: 'mention', content: { label: 'A' } };
// @ts-expect-error A mention must have a label.
const missingLabel: InputMentionNode = { type: 'mention', content: { id: 'a' } };
// @ts-expect-error Text uses content rather than text.
const oldText: InputTextNode = { type: 'text', text: 'hello' };
// @ts-expect-error Public mention values do not contain data.
const privateOutput: InputValue = [{ id: 'a', label: 'A', data: {} }];
void [textNode, mentionNode, fullMention, inputValue, missingId, missingLabel, oldText, privateOutput];

import type { InputI18n, MarkdownInputProps } from '../components/markdown-input/types';
const partialI18n: Partial<InputI18n> = { mentionEmpty: 'No results', placeholder: undefined, removeMention: '' };
const translatedProps: MarkdownInputProps = { i18n: partialI18n };
// @ts-expect-error Only declared i18n keys are supported.
const unknownI18n: Partial<InputI18n> = { unknownKey: 'x' };
// @ts-expect-error i18n values must be strings.
const numericI18n: Partial<InputI18n> = { mentionLoading: 1 };
void [partialI18n, translatedProps, unknownI18n, numericI18n];

import type { MentionPlacement, MentionMobilePlacement } from '../components/markdown-input/types';
const preferredPlacement: MentionPlacement = 'top';
const mobileSheet: MentionMobilePlacement = 'bottom-sheet';
const positionedInput: MarkdownInputProps = { placement: preferredPlacement, offset: 8, mobilePlacement: mobileSheet };
// @ts-expect-error Only auto/top/bottom are supported.
const invalidPlacement: MentionPlacement = 'left';
// @ts-expect-error Mobile placement is bottom-sheet or caret.
const invalidMobilePlacement: MentionMobilePlacement = 'dialog';
// @ts-expect-error Offset must be a number in px.
const invalidOffset: MarkdownInputProps = { offset: '8px' };
void [positionedInput, invalidPlacement, invalidMobilePlacement, invalidOffset];

import { LocalTts } from '../use.lib/speech/local-tts';
import type { LocalTtsOptions } from '../use.lib/speech/types';
const ttsOptions: LocalTtsOptions = { lang: 'zh-CN', flushDelay: 1000, maxChunkLength: 80 };
declare const tts: LocalTts;
const completedSpeech: Promise<void> = tts.finish();
const unsubscribeSpeech: () => void = tts.on('chunkstart', chunk => { const uri: string = chunk.voiceURI; void uri; });
// @ts-expect-error Incremental speech input must be a string.
tts.append(123);
// @ts-expect-error Remote fallback is deliberately not exposed.
const remoteSpeech: LocalTtsOptions = { localOnly: false };
void [ttsOptions, completedSpeech, unsubscribeSpeech, remoteSpeech];

import type { SpeechInputSlotProps, SpeechInputHoldBindings } from '../components/speech-input/types';
import type { SpeechWaveProps } from '../components/speech-wave/types';
declare const speechSlot: SpeechInputSlotProps;
const recordingSpeech: boolean = speechSlot.recording;
const measuredSpeechLevel: number = speechSlot.level;
const holdSpeech: SpeechInputHoldBindings = speechSlot.hold;
const startedSpeech: boolean = speechSlot.start();
const installSpeech: Promise<void> = speechSlot.install();
const coloredWave: SpeechWaveProps = { active: true, level: .7, colors: ['#6366f1', '#06b6d4'], height: 56, intensity: 2, speed: 1.5 };
// @ts-expect-error Wave colors must be strings.
const invalidWave: SpeechWaveProps = { colors: [123] };
void [recordingSpeech, measuredSpeechLevel, holdSpeech, startedSpeech, installSpeech, coloredWave, invalidWave];
