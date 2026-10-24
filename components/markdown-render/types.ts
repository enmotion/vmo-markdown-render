import type { Component, VNode } from 'vue';

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
export type TextRule = { pattern: RegExp } & (
  | {
    /** 字符串按纯文本展示；回调也可返回 Vue VNode。输出不会再次匹配。 */
    replace: string | ((context: TextMatch) => string | VNode);
    component?: never;
    props?: never;
  }
  | {
    /** 每次命中渲染一个真实 Vue 组件。 */
    component: Component;
    props?: Record<string, unknown> | ((context: TextMatch) => Record<string, unknown>);
    replace?: never;
  }
);

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

/** 支持 #RRGGBB / #RRGGBBAA 与逗号分隔的 rgb / rgba；具体格式和范围在运行时校验。 */
export type ThemeColor = `#${string}` | `rgb(${number},${number},${number})` | `rgb(${number}, ${number}, ${number})` | `rgba(${number},${number},${number},${number})` | `rgba(${number}, ${number}, ${number}, ${number})`;

export interface ThemeColors {
  /** 不透明亮色基础色：亮色背景／暗色前景。 */
  lightBackground?: ThemeColor;
  /** 不透明暗色基础色：暗色背景／亮色前景。 */
  darkBackground?: ThemeColor;
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

/** markdown-render 公共属性；不接受可执行的 Vue 模板。 */
export interface MarkdownRenderProps {
  /** 当前累计完整 Markdown，默认空字符串。 */
  content?: string;
  /** 资源基础地址，需为绝对 URL；目录地址请以 / 结尾。 */
  baseUrl?: string;
  /** 同步转换内置图片、音频和视频的地址，不处理普通链接。 */
  resolveUrl?: ResourceUrlResolver;
  /** 是否仍在生成；结束时设为 false，按原文重新解析。 */
  streaming?: boolean;
  /** 默认空字符串不指定主题，跟随宿主 .dark；auto 跟随系统。显式暗色在本容器添加 .dark。 */
  theme?: '' | 'light' | 'dark' | 'auto';
  /** 实例亮暗基础色与语义色；基础色须不透明，非法值忽略。 */
  themeColors?: ThemeColors;
  /** 基础字号，单位 px，默认 12；非正数或非有限值回退到 12。 */
  fontBaseSize?: number;
  /** 小写 kebab-case 标签到业务组件的实例级映射。 */
  components?: Record<string, Component>;
  /** 只处理正文文本，不处理代码、公式、URL 或组件属性。 */
  textRules?: readonly TextRule[];
  /** 提示标题的实例级翻译；键为大写类型，如 IMPORTANT、NOTE；Markdown 自定义标题优先。 */
  alertLabels?: Readonly<Record<string, string>>;
  /** 移除默认排版主题，保留语义结构。 */
  unstyled?: boolean;
}
