// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import Enhanced from '../../components/markdown-render/nodes/enhanced';

const mocks = vi.hoisted(() => ({ math: vi.fn(), highlight: vi.fn(), language: vi.fn(), render: vi.fn(), initialize: vi.fn() }));
vi.mock('katex', () => ({ default: { renderToString: mocks.math } }));
vi.mock('highlight.js/lib/common', () => ({ default: { highlight: mocks.highlight, getLanguage: mocks.language } }));
vi.mock('mermaid', () => ({ default: { render: mocks.render, initialize: mocks.initialize } }));
vi.mock('../../components/markdown-render/nodes/mermaid-view', () => ({ default: { props: ['html'], template: '<div class="diagram" v-html="html" />' } }));

beforeEach(() => {
  mocks.math.mockReset().mockReturnValue('<span class="formula">math</span>');
  mocks.highlight.mockReset().mockReturnValue({ value: '<b>code</b>' });
  mocks.language.mockReset().mockReturnValue(true);
  mocks.render.mockReset().mockImplementation(async (id: string) => {
    const garbage = document.createElement('div'); garbage.id = `d${id}`; document.body.append(garbage);
    return { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" width="120" height="60" />' };
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('增强内容与异步隔离', () => {
  it('拒绝 XML 错误文档、非 SVG 根和错误命名空间，保留源码并报告错误', async () => {
    const originalParser = DOMParser;
    for (const svg of [
      '<parsererror xmlns="http://www.mozilla.org/newlayout/xml/parsererror.xml">invalid br</parsererror>',
      '<html xmlns="http://www.w3.org/1999/xhtml"><parsererror>invalid br</parsererror></html>',
      '<div />', '<svg xmlns="urn:invalid" />',
    ]) {
      mocks.render.mockResolvedValue({ svg });
      const w = mount(Enhanced, { props: { kind: 'mermaid', value: 'original source' } });
      await flushPromises();
      expect(w.find('pre code').text()).toBe('original source');
      expect(w.find('.diagram').exists()).toBe(false);
      expect(w.emitted('error')?.[0][0]).toMatchObject({ stage: 'mermaid' });
      w.unmount();
    }
    // happy-dom 不严格验证 XML；模拟真实浏览器对未闭合 br 返回的错误文档。
    vi.stubGlobal('DOMParser', class {
      parseFromString() { return new originalParser().parseFromString('<parsererror>unclosed br</parsererror>', 'image/svg+xml'); }
    });
    mocks.render.mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><p><br></p></foreignObject></svg>' });
    const w = mount(Enhanced, { props: { kind: 'mermaid', value: 'source with br' } });
    await flushPromises();
    expect(w.find('pre code').text()).toBe('source with br');
    expect(w.emitted('error')?.[0][0]).toMatchObject({ stage: 'mermaid' });
    w.unmount();
  });
  it('渲染公式、代码和未识别语言', async () => {
    const w = mount(Enhanced, { props: { kind: 'math', value: 'x', display: true } });
    await flushPromises(); expect(w.find('div.md-math .formula').exists()).toBe(true);
    await w.setProps({ display: false }); await flushPromises();
    expect(w.find('span.md-math').exists()).toBe(true);
    await w.setProps({ kind: 'code', language: 'ts' }); await flushPromises();
    expect(w.find('pre b').text()).toBe('code');
    mocks.language.mockReturnValue(false);
    await w.setProps({ language: 'unknown' }); await flushPromises(); expect(w.find('pre').text()).toBe('x');
    await w.setProps({ language: undefined }); await flushPromises(); expect(w.find('figcaption span').text()).toBe('code');
    w.unmount();
  });
  it('流式 Mermaid 等待完成，主题、尺寸及临时节点清理', async () => {
    const w = mount(Enhanced, { props: { kind: 'mermaid', value: 'graph LR', pending: true } });
    await flushPromises(); expect(mocks.render).not.toHaveBeenCalled();
    await w.setProps({ pending: false, theme: 'dark' }); await flushPromises();
    expect(mocks.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark' }));
    expect(w.find('svg').attributes('style')).toContain('--md-font-base-size');
    expect(w.find('svg').attributes('width')).toBeUndefined();
    expect(document.querySelector('[id^="dmd-diagram"]')).toBeNull();
    mocks.render.mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg" />' });
    await w.setProps({ value: 'no dimensions', theme: 'light' }); await flushPromises();
    expect(w.find('svg').attributes('style')).toBeUndefined();
    w.unmount();
  });
  it('各增强库失败均保留源文，Mermaid 失败后队列仍可继续', async () => {
    for (const kind of ['math', 'code', 'mermaid'] as const) {
      const error = Error('private');
      mocks.math.mockImplementation(() => { throw error; });
      mocks.highlight.mockImplementation(() => { throw error; });
      mocks.render.mockRejectedValue(error);
      const w = mount(Enhanced, { props: { kind, language: 'ts', value: 'source' } });
      await flushPromises();
      expect(w.text()).toContain('source');
      expect(w.emitted('error')?.[0][0]).toMatchObject({ stage: kind === 'code' ? 'highlight' : kind });
      w.unmount();
    }
    mocks.render.mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 0 1" />' });
    const w = mount(Enhanced, { props: { kind: 'mermaid', value: 'ok' } });
    await flushPromises(); expect(w.find('svg').exists()).toBe(true); w.unmount();
  });
  it('旧异步成功、失败和卸载后的结果不会覆盖最新内容', async () => {
    const math = mount(Enhanced, { props: { kind: 'math', value: 'x' } });
    expect(math.find('.md-math-source').text()).toBe('x'); math.unmount();
    let resolve!: (value: { svg: string }) => void;
    mocks.render.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    const w = mount(Enhanced, { props: { kind: 'mermaid', value: 'old' } });
    await flushPromises();
    await w.setProps({ kind: 'code', value: 'new', language: 'ts' }); await flushPromises();
    resolve({ svg: '<svg xmlns="http://www.w3.org/2000/svg" />' }); await flushPromises();
    expect(w.find('pre b').text()).toBe('code');
    let reject!: (error: Error) => void;
    mocks.render.mockReturnValueOnce(new Promise((_r, r) => { reject = r; }));
    await w.setProps({ kind: 'mermaid', value: 'stale' }); await flushPromises();
    await w.setProps({ kind: 'code', value: 'latest' }); await flushPromises();
    reject(Error('old')); await flushPromises(); expect(w.emitted('error')).toBeUndefined();
    mocks.render.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    await w.setProps({ kind: 'mermaid', value: 'unmounted' }); await flushPromises();
    w.unmount(); resolve({ svg: '<svg xmlns="http://www.w3.org/2000/svg" />' }); await flushPromises();
  });
  it('复制成功后复位，失败时报告', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const w = mount(Enhanced, { props: { kind: 'code', value: 'source' } });
    await w.find('button').trigger('click'); await flushPromises();
    expect(writeText).toHaveBeenCalledWith('source'); expect(w.find('button').text()).toBe('已复制');
    await w.find('button').trigger('click'); await flushPromises();
    await vi.advanceTimersByTimeAsync(1500); expect(w.find('button').text()).toBe('复制');
    writeText.mockRejectedValue(Error('denied'));
    await w.find('button').trigger('click'); await flushPromises();
    expect(w.emitted('error')?.[0][0]).toMatchObject({ stage: 'clipboard' });
    w.unmount();
  });
});
