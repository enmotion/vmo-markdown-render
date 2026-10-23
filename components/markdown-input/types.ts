import type { ThemeColors } from '../markdown-render/types';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export interface InputTextNode { type: 'text'; content: string }
export interface InputMentionContent {
  label: string;
  id: string;
  type?: string;
  data?: Record<string, unknown>;
}
export interface InputMentionNode { type: 'mention'; content: InputMentionContent }
/** 默认对外数组：文字保留 content，mention 仅输出身份与名称。 */
export type InputValueNode = InputTextNode | Omit<InputMentionContent, 'data'>;
export type InputValue = InputValueNode[] | string;
/** 草稿持久化协议；换行保存在 content 中，不解析或执行 Markdown。 */
export interface InputDocument { version: 1; nodes: (InputTextNode | InputMentionNode)[] }
export interface MentionOption {
  value: string; label: string; source?: string; disabled?: boolean; kind?: string;
  data?: Record<string, JsonValue>;
}
export interface MentionSearch {
  prefix: string; query: string;
  /** 当前入口绑定的分类；仅兼容的 prefix 未分类入口可为空。 */
  source?: string;
  /** 每次查询递增；远程请求应只应用最近一次请求结果。 */
  requestId: number;
}
export interface InputSubmit {
  document: InputDocument;
  text: string;
  /** 按出现顺序列出，保留重复引用。 */
  mentions: InputMentionNode[];
}
/** 至少指定 ctrl/alt/shift/meta 中一个修饰键；字符键必须为单个可打印字符。 */
export interface MentionTrigger {
  /** 单个可打印提示字符；仅在半角空格后直接键入时触发。 */
  character: string;
  source: string;
}
export interface MentionShortcut {
  source: string;
  keys: { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean };
  /** 插入标签的展示前缀，默认 @；不会作为字符触发条件。 */
  prefix?: string;
}
/** 高级定制入口；默认输出节点数组，自定义转换可返回字符串。 */
export interface InputTextCodec {
  encode(document: InputDocument): InputValue;
  decode(value: InputValue): InputDocument;
}
export type InputGetter = (document: InputDocument) => InputValue;
export type InputSetter = (value: InputValue) => InputDocument;
export interface InputCodecError { stage: 'encode' | 'decode'; message: string }
export interface InputEnterContext { inCode: boolean; inList: boolean }
export interface MarkdownInputProps {
  /** 对外节点数组，默认空数组；自定义 getter/setter 可使用字符串。 */
  modelValue?: InputValue;
  /** getter：内部节点转换为对外数组或自定义文本，供 v-model 和实例 getter() 使用。 */
  getter?: InputGetter;
  /** setter：外部数组或文本转换为内部节点，供 v-model 与实例 setter(text) 使用。 */
  setter?: InputSetter;
  /** 兼容的未分类单字符入口，默认关闭；新代码使用 mentionTriggers。 */
  prefix?: string | readonly string[];
  /** 多个提示字符与分类映射，仅半角空格后直接输入字符时唤起。 */
  mentionTriggers?: readonly MentionTrigger[];
  mentionShortcuts?: readonly MentionShortcut[];
  options?: readonly MentionOption[];
  loading?: boolean;
  /** false 用于远程过滤；默认按 label / value 本地过滤。 */
  filterOption?: false | ((query: string, option: MentionOption, prefix: string) => boolean);
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  theme?: '' | 'light' | 'dark' | 'auto';
  fontBaseSize?: number;
  themeColors?: ThemeColors;
  unstyled?: boolean;
  /** 仅影响导出文字，不改变草稿及标签。 */
  serializeMention?: (mention: InputMentionNode) => string;
}
