// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { it, expect } from 'vitest';
import { MarkdownRender, VmoButton } from '../index';
it('公共导出及按钮默认值、自定义属性、插槽', () => {
  expect(MarkdownRender).toBeDefined();
  const w = mount(VmoButton, { slots: { default: '按钮' } });
  expect(w.text()).toBe('skekr-按钮'); w.unmount();
  const custom = mount(VmoButton, { props: { perfix: 'custom', params: {} } });
  expect(custom.text()).toBe('custom-'); custom.unmount();
});
