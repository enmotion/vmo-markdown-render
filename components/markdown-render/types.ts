import type { Component } from 'vue';

/** 文本替换回调的稳定上下文，不暴露底层解析器类型。 */
export interface TextMatch {
  /** 原文中完整命中的文本。 */
  match: string;
  /** 捕获组，未参与匹配的分组为 undefined。 */
  captures: readonly (string | undefined)[];
  /** 当前正文文本节点内的偏移。 */
  offset: number;
  input: string;
  groups?: Readonly<Record<string, string | undefined>>;
}

/** 多规则独立匹配原文；同位置按数组顺序取首个，输出不再匹配。 */
export interface TextRule {
  pattern: RegExp;
  /** 字符串支持 $$、$&、$1…$99、$<name>；函数结果按纯文本展示。 */
  replace: string | ((context: TextMatch) => string);
}

export interface MarkdownHeading {
  id: string;
  level: number;
  text: string;
}

export interface MarkdownError {
  stage: 'parse' | 'text-rule' | 'math' | 'mermaid' | 'highlight' | 'component' | 'clipboard';
  message: string;
  ruleIndex?: number;
}

/** markdown-render 公共属性；不接受可执行的 Vue 模板。 */
export interface MarkdownRenderProps {
  /** 当前累计完整 Markdown，默认空字符串。 */
  content?: string;
  /** 是否仍在生成；结束时设为 false，按原文重新解析。 */
  streaming?: boolean;
  /** 默认空字符串不指定主题，跟随宿主 .dark；auto 跟随系统。显式暗色在本容器添加 .dark。 */
  theme?: '' | 'light' | 'dark' | 'auto';
  /** 基础字号，单位 px，默认 12；非正数或非有限值回退到 12。 */
  fontBaseSize?: number;
  /** 小写 kebab-case 标签到业务组件的实例级映射。 */
  components?: Record<string, Component>;
  /** 只处理正文文本，不处理代码、公式、URL 或组件属性。 */
  textRules?: readonly TextRule[];
  /** 移除默认排版主题，保留语义结构。 */
  unstyled?: boolean;
}
