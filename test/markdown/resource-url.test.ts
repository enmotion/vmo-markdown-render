// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import MarkdownRender from '../../components/markdown-render/markdown-render.vue';
import { resolveResource } from '../../components/markdown-render/resource-url';

it('三类资源准确传递类型与原地址，普通链接不转换，props 更新生效', async () => {
  const resolveUrl = vi.fn((url: string) => `/proxy?url=${encodeURIComponent(url)}`);
  const w = mount(MarkdownRender, { props: {
    content: '![封面](./123)\n\n```audio\n../456\n```\n\n```video\n/789\n```\n\n[链接](./123)',
    baseUrl: 'https://example.com/docs/article/', resolveUrl,
  } });
  for (const [type, originalUrl, full, selector] of [
    ['image', './123', 'https://example.com/docs/article/123', 'img'],
    ['audio', '../456', 'https://example.com/docs/456', 'audio'],
    ['video', '/789', 'https://example.com/789', 'video'],
  ]) {
    expect(resolveUrl).toHaveBeenCalledWith(full, { type, originalUrl });
    expect(w.find(selector).attributes('src')).toBe(`/proxy?url=${encodeURIComponent(full)}`);
  }
  expect(resolveUrl).toHaveBeenCalledTimes(3);
  expect(w.find('a').attributes('href')).toBe('./123');
  await w.setProps({ baseUrl: 'https://cdn.example.com/' });
  expect(w.find('img').attributes('src')).toContain(encodeURIComponent('https://cdn.example.com/123'));
  w.unmount();
});

it('默认保留地址，支持绝对地址和协议相对地址', () => {
  const report = vi.fn();
  expect(resolveResource('./x', 'image', {}, report)).toBe('./x');
  expect(resolveResource('https://cdn.example/x', 'video', { baseUrl: 'https://example.com/' }, report)).toBe('https://cdn.example/x');
  expect(resolveResource('//cdn.example/x', 'audio', { baseUrl: 'https://example.com/' }, report)).toBe('https://cdn.example/x');
  expect(resolveResource('', 'image', {}, report)).toBeUndefined();
  expect(report).not.toHaveBeenCalled();
});

it('无效基址、危险地址和回调失败移除 src 并报告 resource 错误', () => {
  const report = vi.fn();
  for (const props of [
    { baseUrl: '/relative/' },
    { baseUrl: 'ftp://example.com/files/' },
    { resolveUrl: () => { throw new Error(); } },
    { resolveUrl: () => 'javascript:alert(1)' },
    { resolveUrl: () => '' },
  ]) expect(resolveResource('/x', 'audio', props, report)).toBeUndefined();
  expect(resolveResource('javascript:alert(1)', 'video', {}, report)).toBeUndefined();
  expect(report).toHaveBeenCalledTimes(6);
  expect(report).toHaveBeenCalledWith(expect.objectContaining({ stage: 'resource' }));
});
