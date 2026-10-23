import type { ThemeColor, ThemeColors, TextRule } from '../components/markdown-render/types';
import { defineComponent, h } from 'vue';

const colors: ThemeColors = { primary: '#112233', warning: '#11223344', info: 'rgb(1, 2, 3)', danger: 'rgba(1,2,3,0.5)' };
// @ts-expect-error Only the five supported color properties are accepted.
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
