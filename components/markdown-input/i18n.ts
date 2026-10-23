import { computed } from 'vue';
import type { InputI18n, MarkdownInputProps } from './types';

/** 完整中文默认文案；宿主通过 i18n 覆盖，不在组件内管理语言。 */
export const defaultInputI18n: Readonly<InputI18n> = Object.freeze({
  placeholder: '输入消息…',
  mentionCandidates: '引用候选',
  mentionSearchLabel: '搜索引用',
  mentionSearchPlaceholder: '输入关键词搜索',
  mentionClose: '关闭引用',
  mentionHint: '输入关键词搜索',
  mentionLoading: '正在搜索…',
  mentionEmpty: '没有匹配的内容',
  removeMention: '删除 {label}',
  getterError: '文本导出失败，已使用默认转换保留内容',
  setterError: '内容导入失败，字符串按普通文字保留，其他无效输入已清空',
});

export function useInputI18n(props: Pick<MarkdownInputProps, 'i18n'>) {
  return computed<InputI18n>(() => {
    const text = { ...defaultInputI18n };
    for (const key of Object.keys(text) as (keyof InputI18n)[]) {
      const value = props.i18n?.[key];
      if (typeof value === 'string') text[key] = value;
    }
    return text;
  });
}

/** 回调替换保留 label 中的 $& 等字面字符，不解析 HTML。 */
export function formatInputLabel(template: string, label: string): string {
  return template.replace(/\{label\}/g, () => label);
}
