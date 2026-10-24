import type { ThemeColors } from './types';

const keys = ['primary', 'warning', 'info', 'danger', 'success'] as const;

/** 模板字面量约束格式前缀，运行时检查十六进制位数、字符和通道范围。 */
export function isThemeColor(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (/^#(?:[\da-f]{6}|[\da-f]{8})$/i.test(value)) return true;
  const match = /^(rgb|rgba)\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0(?:\.\d+)?|1(?:\.0+)?|\.\d+)\s*)?\)$/.exec(value);
  return !!match && (match[1] === 'rgba') === (match[5] !== undefined)
    && match.slice(2, 5).every(channel => Number(channel) <= 255);
}

export function themeColorStyles(colors?: ThemeColors): Record<string, string> {
  const styles: Record<string, string> = {};
  for (const key of keys) {
    const value = colors?.[key];
    if (isThemeColor(value)) styles[`--md-${key}`] = value;
  }
  for (const key of ['lightBackground', 'darkBackground'] as const) {
    const value = colors?.[key];
    // 基础色必须不透明；语义色仍兼容既有 alpha 配置。
    if (isThemeColor(value) && (!value.startsWith('#') || value.length === 7 || value.slice(-2).toLowerCase() === 'ff')
      && (!value.startsWith('rgba') || Number(value.slice(value.lastIndexOf(',') + 1, -1)) === 1)) {
      styles[key === 'lightBackground' ? '--md-light-background' : '--md-dark-background'] = value;
    }
  }
  return styles;
}
