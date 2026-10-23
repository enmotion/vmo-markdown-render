# Public types and default helpers

Import all public types/helpers from the npm package entry. Do not depend on internal components or use.lib paths.

```ts
import { MarkdownInput, MarkdownRender, defaultInputCodec, defaultInputI18n } from 'vmo-markdown-render';
import type { InputValue, InputDocument, InputMentionNode, MentionOption, MentionSearch, InputI18n, MarkdownRenderProps, ThemeColors } from 'vmo-markdown-render';
```

## Default conversion helpers

```ts
import { defaultInputCodec, defaultInputI18n, type InputDocument } from 'vmo-markdown-render';
const document: InputDocument = { version: 1, nodes: [
  { type: 'text', content: 'Ask ' },
  { type: 'mention', content: { label: 'Alice', id: 'user-alice', type: 'member' } },
] };
const value = defaultInputCodec.encode(document); // Default external array; no data.
const restored = defaultInputCodec.decode(value);
console.log(restored, defaultInputI18n.mentionEmpty);
```

encode/decode retain their helper names for compatibility but do not URI-encode the default protocol. A string passed to default decode becomes plain text, not inferred mentions. defaultInputI18n is the frozen Chinese KV; override it with the component i18n prop rather than mutating defaults.

Use `ref<InstanceType<typeof MarkdownInput>>()` for the component ref. Input exposes getter/setter/getText and editing helpers; Render exposes no custom instance methods.

## Input types

See the [Input API](./markdown-input) for events and methods.

```ts
import type { ThemeColors } from 'vmo-markdown-render';

export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};

export interface InputTextNode {
    type: 'text';
    content: string;
}

export interface InputMentionContent {
    label: string;
    id: string;
    type?: string;
    data?: Record<string, unknown>;
}

export interface InputMentionNode {
    type: 'mention';
    content: InputMentionContent;
}

export type InputValueNode = InputTextNode | Omit<InputMentionContent, 'data'>;

export type InputValue = InputValueNode[] | string;

export interface InputDocument {
    version: 1;
    nodes: (InputTextNode | InputMentionNode)[];
}

export interface MentionOption {
    value: string;
    label: string;
    source?: string;
    disabled?: boolean;
    kind?: string;
    data?: Record<string, JsonValue>;
}

export interface MentionSearch {
    prefix: string;
    query: string;
    source?: string;
    requestId: number;
}

export interface MentionTrigger {
    character: string;
    source: string;
}

export interface MentionShortcut {
    source: string;
    keys: {
        key: string;
        ctrl?: boolean;
        alt?: boolean;
        shift?: boolean;
        meta?: boolean;
    };
    prefix?: string;
}

export interface InputTextCodec {
    encode(document: InputDocument): InputValue;
    decode(value: InputValue): InputDocument;
}

export type InputGetter = (document: InputDocument) => InputValue;

export type InputSetter = (value: InputValue) => InputDocument;

export interface InputCodecError {
    stage: 'encode' | 'decode';
    message: string;
}

export interface InputEnterContext {
    inCode: boolean;
    inList: boolean;
}

export interface InputI18n {
    placeholder: string;
    mentionCandidates: string;
    mentionSearchLabel: string;
    mentionSearchPlaceholder: string;
    mentionClose: string;
    mentionHint: string;
    mentionLoading: string;
    mentionEmpty: string;
    removeMention: string;
    getterError: string;
    setterError: string;
}

export type MentionPlacement = 'auto' | 'top' | 'bottom';

export type MentionMobilePlacement = 'bottom-sheet' | 'caret';

export interface MarkdownInputProps {
    modelValue?: InputValue;
    getter?: InputGetter;
    setter?: InputSetter;
    prefix?: string | readonly string[];
    mentionTriggers?: readonly MentionTrigger[];
    mentionShortcuts?: readonly MentionShortcut[];
    options?: readonly MentionOption[];
    loading?: boolean;
    placement?: MentionPlacement;
    offset?: number;
    mobilePlacement?: MentionMobilePlacement;
    filterOption?: false | ((query: string, option: MentionOption, prefix: string) => boolean);
    i18n?: Partial<InputI18n>;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    theme?: '' | 'light' | 'dark' | 'auto';
    fontBaseSize?: number;
    themeColors?: ThemeColors;
    unstyled?: boolean;
    serializeMention?: (mention: InputMentionNode) => string;
}
```

## Render and theme types

```ts
import type { Component, VNode } from 'vue';

export interface TextMatch {
    match: string;
    captures: readonly (string | undefined)[];
    offset: number;
    input: string;
    groups?: Readonly<Record<string, string | undefined>>;
}

export type TextRule = {
    pattern: RegExp;
} & ({
    replace: string | ((context: TextMatch) => string | VNode);
    component?: never;
    props?: never;
} | {
    component: Component;
    props?: Record<string, unknown> | ((context: TextMatch) => Record<string, unknown>);
    replace?: never;
});

export interface MarkdownHeading {
    id: string;
    level: number;
    text: string;
}

export interface MarkdownError {
    stage: 'parse' | 'text-rule' | 'math' | 'mermaid' | 'highlight' | 'component' | 'clipboard' | 'resource';
    message: string;
    ruleIndex?: number;
}

export type ThemeColor = `#${string}` | `rgb(${number},${number},${number})` | `rgb(${number}, ${number}, ${number})` | `rgba(${number},${number},${number},${number})` | `rgba(${number}, ${number}, ${number}, ${number})`;

export interface ThemeColors {
    primary?: ThemeColor;
    warning?: ThemeColor;
    info?: ThemeColor;
    danger?: ThemeColor;
    success?: ThemeColor;
}

export interface ResourceUrlContext {
    type: 'image' | 'audio' | 'video';
    originalUrl: string;
}

export type ResourceUrlResolver = (url: string, context: ResourceUrlContext) => string;

export interface MarkdownRenderProps {
    content?: string;
    baseUrl?: string;
    resolveUrl?: ResourceUrlResolver;
    streaming?: boolean;
    theme?: '' | 'light' | 'dark' | 'auto';
    themeColors?: ThemeColors;
    fontBaseSize?: number;
    components?: Record<string, Component>;
    textRules?: readonly TextRule[];
    alertLabels?: Readonly<Record<string, string>>;
    unstyled?: boolean;
}
```

## Compatibility exports

VmoButton and ButtonParams remain available for older consumers. MarkdownInput does not depend on that button; hosts choose their own send controls.
