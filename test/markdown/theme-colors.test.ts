import { describe, it, expect } from 'vitest';
import { isThemeColor, themeColorStyles } from '../../components/markdown-render/theme-colors';
import type { ThemeColors } from '../../components/markdown-render/types';

describe('themeColors', () => {
  it('只接受六或八位 hex、合法 rgb/rgba 通道', () => {
    for (const value of ['#4f46e5', '#AABBCC88', 'rgb(0, 128, 255)', 'rgba(255,0,1,.5)', 'rgba(0, 0, 0, 1)']) expect(isThemeColor(value), value).toBe(true);
    for (const value of ['#fff', '#1234567', '#gggggg', 'red', 'var(--x)', 'rgb(256,0,0)', 'rgba(0,0,0,1.1)', 'rgb(0,0,0,.5)', 'rgba(0,0,0)', 'url(x)', null]) expect(isThemeColor(value), String(value)).toBe(false);
  });
  it('忽略非法值和未知键', () => {
    expect(themeColorStyles({ primary: '#112233', danger: 'red', unknown: '#ffffff' } as unknown as ThemeColors)).toEqual({ '--md-primary': '#112233' });
  });
});
