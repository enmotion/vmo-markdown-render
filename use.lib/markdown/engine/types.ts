/** 独立于第三方 token 的渲染协议。 */
export interface MarkdownNode {
  type: 'element' | 'text' | 'code' | 'math' | 'component' | 'toc';
  tag?: string;
  attrs?: Record<string, string>;
  children?: MarkdownNode[];
  value?: string;
  language?: string;
  display?: boolean;
  /** 在同一文档追加期间保持稳定，不使用内容哈希作为身份。 */
  key: string;
}
