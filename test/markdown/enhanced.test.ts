// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import Enhanced from '../../components/markdown-render/nodes/enhanced';
import Render from '../../components/markdown-render/markdown-render.vue';

const mocks = vi.hoisted(() => ({ math: vi.fn(), highlight: vi.fn(), language: vi.fn(), render: vi.fn(), initialize: vi.fn() }));
vi.mock('katex', () => ({ default: { renderToString: mocks.math } }));
vi.mock('highlight.js/lib/common', () => ({ default: { highlight: mocks.highlight, getLanguage: mocks.language } }));
vi.mock('mermaid', () => ({ default: { render: mocks.render, initialize: mocks.initialize } }));
vi.mock('../../components/markdown-render/nodes/mermaid-view', () => ({ default: { props: ['html'], template: '<div class="diagram" v-html="html" />' } }));

beforeEach(() => {
  mocks.math.mockReset().mockReturnValue('<span class="formula">math</span>');
  mocks.highlight.mockReset().mockReturnValue({ value: '<b>code</b>' });
  mocks.language.mockReset().mockReturnValue(true);
  mocks.render.mockReset().mockImplementation(async (id: string, _source: string, container: HTMLElement) => {
    const garbage = document.createElement('div'); garbage.id = `d${id}`; container.append(garbage);
    return { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" width="120" height="60" />' };
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('增强内容与异步隔离', () => {
  it('卸载等待模块加载的图表后不再初始化或布局', async () => {
    const calls = mocks.initialize.mock.calls.length;
    const w = mount(Enhanced, { props: { kind: 'mermaid', value: 'removed while importing' } });
    await Promise.resolve(); w.unmount(); await flushPromises();
    expect(mocks.initialize).toHaveBeenCalledTimes(calls); expect(mocks.render).not.toHaveBeenCalled();
  });
  it('打开和关闭图片预览不会重新执行 Mermaid 布局', async () => {
    const w = mount(Render, { attachTo: document.body, props: {
      content: '![图片](/image.png)\n\n```mermaid\ngraph LR\n A-->B\n```',
    } });
    try {
      await flushPromises();
      expect(mocks.render).toHaveBeenCalledTimes(1);
      for (let index = 0; index < 3; index++) {
        await w.get('img').trigger('click'); await flushPromises();
        const dialog = document.querySelector<HTMLElement>('.md-image-preview')!;
        expect(dialog).not.toBeNull();
        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await flushPromises();
        expect(document.querySelector('.md-image-preview')).toBeNull();
      }
      expect(mocks.render).toHaveBeenCalledTimes(1);
      expect(mocks.initialize).toHaveBeenCalledTimes(1);
    } finally { w.unmount(); }
  });
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
    expect(mocks.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark', layout: 'dagre' }));
    expect(w.find('svg').attributes('style')).toContain('--md-diagram-font-scale');
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
    expect(document.querySelector('[data-md-mermaid-measure]')).toBeNull();
  });
  it('跳过队列中已被修改或卸载的 Mermaid，仅布局最新内容', async () => {
    let resolve!: (value: { svg: string }) => void;
    mocks.render.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    const first = mount(Enhanced, { props: { kind: 'mermaid', value: 'running' } });
    await flushPromises();
    const queued = mount(Enhanced, { props: { kind: 'mermaid', value: 'queued-old' } });
    await flushPromises();
    await queued.setProps({ value: 'queued-latest' }); await flushPromises();
    const removed = mount(Enhanced, { props: { kind: 'mermaid', value: 'removed' } });
    await flushPromises(); removed.unmount();
    expect(mocks.render).toHaveBeenCalledTimes(1);
    resolve({ svg: '<svg xmlns="http://www.w3.org/2000/svg" />' }); await flushPromises();
    expect(mocks.render.mock.calls.map(call => call[1])).toEqual(['running', 'queued-latest']);
    expect(document.querySelector('[data-md-mermaid-measure]')).toBeNull();
    first.unmount(); queued.unmount();
  });
  it('主题重绘期间保留旧图，成功替换；失败清空旧图并清理测量容器', async () => {
    const w = mount(Enhanced, { props: { kind: 'mermaid', value: 'same source' } });
    await flushPromises();
    const old = w.find('.diagram').html();
    let resolve!: (value: { svg: string }) => void;
    mocks.render.mockImplementationOnce((_id, _source, container) => {
      expect(container.isConnected).toBe(true);
      expect(container.style.position).toBe('fixed');
      expect(container.style.visibility).toBe('hidden');
      return new Promise(r => { resolve = r; });
    });
    await w.setProps({ theme: 'dark' }); await flushPromises();
    expect(w.find('.diagram').html()).toBe(old);
    expect(document.querySelectorAll('[data-md-mermaid-measure]')).toHaveLength(1);
    resolve({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>dark</text></svg>' });
    await flushPromises();
    expect(w.find('.diagram').text()).toBe('dark');
    expect(document.querySelector('[data-md-mermaid-measure]')).toBeNull();
    mocks.render.mockRejectedValueOnce(Error('failed'));
    await w.setProps({ theme: 'light' }); await flushPromises();
    expect(w.find('.diagram').exists()).toBe(false);
    expect(w.find('pre code').text()).toBe('same source');
    expect(w.emitted('error')?.[0][0]).toMatchObject({ stage: 'mermaid' });
    expect(document.querySelector('[data-md-mermaid-measure]')).toBeNull();
    w.unmount();
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
