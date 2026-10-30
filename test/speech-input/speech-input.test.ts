// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import SpeechInput from '../../components/speech-input/speech-input.vue';
import MarkdownInput from '../../components/markdown-input/markdown-input.vue';
import { setSelectionOffsets } from '../../components/markdown-input/dom';
import type { BrowserSpeechRecognition } from '../../components/speech-input/browser';
import type { SpeechInputSlotProps } from '../../components/speech-input/types';

class Recognition implements BrowserSpeechRecognition {
  static instances: Recognition[] = [];
  static available = vi.fn(async () => 'available' as const);
  static install = vi.fn(async (options: { langs: string[]; processLocally?: boolean }) => options.processLocally === true);
  lang = ''; continuous = false; interimResults = false; processLocally = false; phrases: unknown[] = [];
  onstart: BrowserSpeechRecognition['onstart'] = null;
  onend: BrowserSpeechRecognition['onend'] = null;
  onerror: BrowserSpeechRecognition['onerror'] = null;
  onresult: BrowserSpeechRecognition['onresult'] = null;
  start = vi.fn(); stop = vi.fn(); abort = vi.fn();
  constructor() { Recognition.instances.push(this); }
  result(...parts: { text: string; final: boolean }[]) {
    this.onresult?.({ results: parts.map(part => ({ isFinal: part.final, 0: { transcript: part.text } })) });
  }
}
const wrappers: VueWrapper[] = [];
const originalPolicy = Object.getOwnPropertyDescriptor(document, 'permissionsPolicy');
function setup(props: Record<string, unknown> = {}) {
  // UI belongs to the host. This fixture exercises the public scoped-slot API.
  const wrapper = mount(SpeechInput, { attachTo: document.body, props: { mode: 'browser', punctuation: false, ...props }, slots: { default: (speech: SpeechInputSlotProps) => [
    h('button', { ...speech.hold, class: 'speech-input__microphone', disabled: speech.disabled || !speech.canStart && !speech.busy || speech.state === 'stopping' }, speech.recording ? '松开结束' : '按住说话'),
    speech.availability === 'downloadable' ? h('button', { onClick: speech.install }, '安装语言包') : null,
    h('button', { onClick: speech.refresh }, '重新检测'),
    h('span', { class: 'test-availability' }, speech.availability),
    speech.error ? h('p', speech.error.message) : null,
    speech.error?.cause ? h('details', { class: 'speech-input__error-detail' }, [h('summary', '详情'), h('p', speech.error.cause.message)]) : null,
    speech.transcript ? h('p', { class: 'speech-input__preview' }, speech.transcript) : null,
    h('div', { contenteditable: 'true', 'data-editor': '' }),
  ] } });
  wrappers.push(wrapper);
  // happy-dom versions differ in contenteditable support.
  Object.defineProperty(wrapper.get('[data-editor]').element, 'isContentEditable', { value: true, configurable: true });
  return wrapper;
}
function current() { return Recognition.instances.at(-1)!; }
async function down(wrapper: VueWrapper) { await wrapper.get('[data-editor]').trigger('keydown', { key: ' ', code: 'Space' }); }
function up(key = ' ') { window.dispatchEvent(new KeyboardEvent('keyup', { key, code: key === ' ' ? 'Space' : 'Enter', bubbles: true, cancelable: true })); }
beforeEach(() => {
  vi.useFakeTimers(); Recognition.instances = []; Recognition.available.mockReset().mockResolvedValue('available'); Recognition.install.mockReset().mockImplementation(async options => options.processLocally === true);
  vi.stubGlobal('SpeechRecognition', Recognition); vi.stubGlobal('webkitSpeechRecognition', undefined); vi.stubGlobal('SpeechRecognitionPhrase', undefined); vi.stubGlobal('isSecureContext', true);
});
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.useRealTimers(); vi.unstubAllGlobals();
  if (originalPolicy) Object.defineProperty(document, 'permissionsPolicy', originalPolicy); else Reflect.deleteProperty(document, 'permissionsPolicy');
});

describe('push-to-talk', () => {
  it('previews cumulative results and commits exactly once after stop/end, with keyword events', async () => {
    const wrapper = setup({ enabled: true, keywords: ['知识库', { phrase: 'Markdown', id: 'md' }] });
    await down(wrapper); const recognition = current(); recognition.onstart?.();
    expect(recognition.lang).toBe('zh-CN'); expect(recognition.continuous).toBe(true);
    recognition.result({ text: '请查询知识库', final: true }, { text: '和 Mark', final: false });
    await nextTick(); expect(wrapper.get('.speech-input__preview').text()).toContain('Mark'); expect(wrapper.emitted('result')).toBeUndefined();
    await wrapper.get('[data-editor]').trigger('keydown', { key: ' ', code: 'Space', repeat: true });
    expect(recognition.start).toHaveBeenCalledTimes(1);
    up('Enter'); expect(recognition.stop).not.toHaveBeenCalled();
    up(); expect(recognition.stop).toHaveBeenCalledTimes(1);
    recognition.result({ text: '请查询知识库', final: true }, { text: '和 Markdown', final: true });
    recognition.onend?.(); await nextTick();
    expect(wrapper.emitted('result')).toEqual([['请查询知识库和 Markdown']]);
    expect(wrapper.emitted('keyword')).toHaveLength(2); expect(wrapper.attributes('data-state')).toBe('idle');
    expect(wrapper.find('.speech-input__preview').exists()).toBe(false);
  });
  it('stops immediately when startup completes after Space was released', async () => {
    const wrapper = setup({ enabled: true }); await down(wrapper); const recognition = current();
    up(); expect(recognition.stop).not.toHaveBeenCalled();
    recognition.onstart?.(); expect(recognition.stop).toHaveBeenCalledOnce();
    recognition.result({ text: '短句', final: true }); recognition.onend?.();
    expect(wrapper.emitted('result')).toEqual([['短句']]);
  });
  it('keeps ordinary Space, IME and mention menus intact', async () => {
    const wrapper = setup(); await down(wrapper); expect(Recognition.instances.every(item => item.start.mock.calls.length === 0)).toBe(true);
    await wrapper.setProps({ enabled: true });
    await wrapper.get('[data-editor]').trigger('compositionstart'); await down(wrapper); expect(Recognition.instances.every(item => item.start.mock.calls.length === 0)).toBe(true);
    await wrapper.get('[data-editor]').trigger('compositionend');
    await wrapper.get('[data-editor]').trigger('keydown', { key: ' ', isComposing: true });
    await wrapper.get('[data-editor]').trigger('keydown', { key: ' ', ctrlKey: true });
    wrapper.get('[data-editor]').element.setAttribute('aria-autocomplete', 'list'); wrapper.get('[data-editor]').element.setAttribute('aria-expanded', 'true');
    await down(wrapper); expect(Recognition.instances.every(item => item.start.mock.calls.length === 0)).toBe(true);
  });
  it('supports a held pointer and release outside the component', async () => {
    const wrapper = setup(); await nextTick(); await wrapper.get('.speech-input__microphone').trigger('pointerdown', { button: 0, pointerId: 4 });
    const recognition = current(); recognition.onstart?.();
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 5 })); expect(recognition.stop).not.toHaveBeenCalled();
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 4 })); expect(recognition.stop).toHaveBeenCalledOnce();
  });
  it('supports accessible microphone keyboard use without enabling editor Space', async () => {
    const wrapper = setup(); await nextTick(); await wrapper.get('.speech-input__microphone').trigger('keydown', { key: 'Enter' });
    const recognition = current(); recognition.onstart?.(); up('Enter'); expect(recognition.stop).toHaveBeenCalledOnce();
  });
  it.each(['escape', 'blur', 'disable', 'unmount', 'toggle', 'pointercancel'])('cancels on %s and ignores late callbacks', async reason => {
    const wrapper = setup({ enabled: true });
    await nextTick();
    if (reason === 'pointercancel') await wrapper.get('.speech-input__microphone').trigger('pointerdown', { button: 0, pointerId: 1 }); else await down(wrapper);
    const recognition = current(); recognition.onstart?.(); recognition.result({ text: '不应插入', final: true });
    const lateEnd = recognition.onend!, lateResult = recognition.onresult!;
    if (reason === 'escape') await wrapper.get('[data-editor]').trigger('keydown', { key: 'Escape' });
    if (reason === 'blur') window.dispatchEvent(new Event('blur'));
    if (reason === 'disable') await wrapper.setProps({ disabled: true });
    if (reason === 'toggle') await wrapper.setProps({ enabled: false });
    if (reason === 'unmount') wrapper.unmount();
    if (reason === 'pointercancel') window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 }));
    lateResult({ results: [{ isFinal: true, 0: { transcript: '迟到结果' } }] }); lateEnd();
    expect(recognition.abort).toHaveBeenCalledOnce(); expect(wrapper.emitted('result')).toBeUndefined();
  });
  it('surfaces permission errors and allows another attempt', async () => {
    const wrapper = setup({ enabled: true }); await down(wrapper); current().onerror?.({ error: 'not-allowed' });
    await nextTick(); expect(wrapper.text()).toContain('麦克风权限被拒绝'); expect(wrapper.emitted('error')?.[0]?.[0]).toMatchObject({ code: 'not-allowed' });
    await down(wrapper); expect(current().start).toHaveBeenCalledOnce(); expect(wrapper.attributes('data-state')).toBe('starting');
  });
  it('does not commit an unfinished interim result', async () => {
    const wrapper = setup({ enabled: true }); await down(wrapper); current().onstart?.(); current().result({ text: '未完成', final: false }); up(); current().onend?.();
    expect(wrapper.emitted('result')).toBeUndefined(); expect(wrapper.emitted('error')?.[0]?.[0]).toMatchObject({ code: 'no-speech' });
  });
  it('punctuates each final segment once, while leaving unfinished preview text alone', async () => {
    const wrapper = setup({ enabled: true, punctuation: true }); await down(wrapper); current().onstart?.();
    current().result({ text: '第一句话', final: true }, { text: '第二句', final: false }); await nextTick();
    expect(wrapper.get('.speech-input__preview').text()).toBe('第一句话。第二句');
    current().result({ text: '第一句话', final: true }, { text: '第二句话？', final: true });
    current().result({ text: '第一句话', final: true }, { text: '第二句话？', final: true });
    up(); current().onend?.();
    expect(wrapper.emitted('result')).toEqual([['第一句话。第二句话？']]);
  });
  it('bounds microphone duration and handles a service that never ends', async () => {
    const wrapper = setup({ enabled: true }); await down(wrapper); current().onstart?.();
    vi.advanceTimersByTime(60000); expect(current().stop).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(10000); expect(current().abort).toHaveBeenCalledOnce(); expect(wrapper.emitted('error')?.[0]?.[0]).toMatchObject({ code: 'timeout' });
  });
});

describe('browser and local capabilities', () => {
  it.each([true, false])('requests native inferred punctuation when supported (enabled=%s)', async punctuation => {
    vi.stubGlobal('SpeechRecognition', class extends Recognition { unspokenPunctuation = !punctuation; });
    const wrapper = setup({ enabled: true, punctuation }); await down(wrapper);
    expect((current() as Recognition & { unspokenPunctuation: boolean }).unspokenPunctuation).toBe(punctuation);
  });
  it('requires local capability and never silently enables browser service', async () => {
    vi.stubGlobal('SpeechRecognition', class { start = vi.fn(); });
    const wrapper = setup({ mode: 'local', enabled: true }); await flushPromises(); await down(wrapper);
    expect(wrapper.text()).toContain('没有提供本地语音识别接口'); expect(wrapper.get('.speech-input__microphone').attributes('disabled')).toBeDefined();
    expect(wrapper.emitted('result')).toBeUndefined();
  });
  it('checks and installs a local language pack explicitly', async () => {
    Recognition.available.mockResolvedValueOnce('downloadable' as 'available');
    const wrapper = setup({ mode: 'local', enabled: true }); await flushPromises();
    expect(Recognition.install).not.toHaveBeenCalled(); expect(Recognition.available).toHaveBeenCalledWith({ langs: ['zh-CN'], processLocally: true });
    await wrapper.findAll('button').find(button => button.text() === '安装语言包')!.trigger('click'); await flushPromises();
    expect(Recognition.install).toHaveBeenCalledWith({ langs: ['zh-CN'], processLocally: true });
    await down(wrapper); expect(current().processLocally).toBe(true);
  });
  it.each([
    ['NotAllowedError', 'install-not-allowed', 'Requires handling a user gesture.'],
    ['InvalidStateError', 'install-invalid-state', 'The document is not fully active.'],
    ['SyntaxError', 'install-invalid-language', 'Invalid language tag.'],
  ])('preserves the browser %s instead of hiding installation failures', async (name, code, message) => {
    Recognition.available.mockResolvedValueOnce('downloadable' as 'available');
    Recognition.install.mockRejectedValueOnce(new DOMException(message, name));
    const wrapper = setup({ mode: 'local' }); await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === '安装语言包')!.trigger('click'); await flushPromises();
    expect(wrapper.emitted('error')?.at(-1)?.[0]).toMatchObject({ code, cause: { name, message } });
    await wrapper.get('summary').trigger('click'); expect(wrapper.get('.speech-input__error-detail').text()).toContain(message);
  });
  it('reports an unexplained false install result without claiming a known download cause', async () => {
    Recognition.available.mockResolvedValueOnce('downloadable' as 'available'); Recognition.install.mockResolvedValueOnce(false);
    const wrapper = setup({ mode: 'local' }); await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === '安装语言包')!.trigger('click'); await flushPromises();
    expect(wrapper.text()).toContain('没有提供具体原因'); expect(wrapper.emitted('error')?.at(-1)?.[0]).toMatchObject({ code: 'install-failed' });
  });
  it('distinguishes an embedding policy restriction from missing language support', async () => {
    Object.defineProperty(document, 'permissionsPolicy', { configurable: true, value: { allowsFeature: () => false } });
    const wrapper = setup({ mode: 'local' }); await flushPromises();
    expect(wrapper.text()).toContain('Permissions-Policy'); expect(Recognition.available).not.toHaveBeenCalled(); expect(Recognition.install).not.toHaveBeenCalled();
    Object.defineProperty(document, 'permissionsPolicy', { configurable: true, value: { allowsFeature: () => true } });
    await wrapper.findAll('button').find(button => button.text() === '重新检测')!.trigger('click'); await flushPromises();
    expect(wrapper.get('.speech-input__microphone').attributes('disabled')).toBeUndefined();
  });
  it('keeps a pending browser download distinct from a missing pack and allows manual refresh', async () => {
    Recognition.available.mockResolvedValueOnce('downloadable' as 'available').mockResolvedValueOnce('downloading' as 'available');
    const wrapper = setup({ mode: 'local' }); await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === '安装语言包')!.trigger('click'); await flushPromises();
    expect(wrapper.get('.test-availability').text()).toBe('downloading'); expect(wrapper.findAll('button').some(button => button.text() === '安装语言包')).toBe(false);
    expect(wrapper.get('.speech-input__microphone').attributes('disabled')).toBeDefined();
    await wrapper.findAll('button').find(button => button.text() === '重新检测')!.trigger('click'); await flushPromises();
    expect(wrapper.get('.speech-input__microphone').attributes('disabled')).toBeUndefined(); expect(Recognition.install).toHaveBeenCalledOnce();
  });
  it('ignores stale capability checks after switching modes', async () => {
    let resolve!: (result: 'available') => void;
    Recognition.available.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const wrapper = setup({ mode: 'local' }); await wrapper.setProps({ mode: 'browser' }); resolve('unavailable' as 'available'); await flushPromises();
    expect(wrapper.attributes('data-state')).toBe('idle'); expect(wrapper.get('.speech-input__microphone').attributes('disabled')).toBeUndefined();
  });
  it('configures supported hotwords and matches keywords independently of hotword support', async () => {
    vi.stubGlobal('SpeechRecognitionPhrase', class { constructor(public phrase: string, public boost: number) {} });
    const wrapper = setup({ enabled: true, boostKeywords: true, keywords: [{ phrase: 'Markdown', boost: 99 }] }); await down(wrapper);
    expect(current().phrases).toEqual([{ phrase: 'Markdown', boost: 10 }]);
    current().result({ text: 'markdown', final: true }); current().onend?.(); expect(wrapper.emitted('keyword')).toHaveLength(1);
  });
  it('keeps native hints opt-in even when the browser exposes the API', async () => {
    vi.stubGlobal('SpeechRecognitionPhrase', class { constructor(public phrase: string, public boost: number) {} });
    const wrapper = setup({ mode: 'local', enabled: true, keywords: ['知识库'] }); await flushPromises(); await down(wrapper);
    expect(current().processLocally).toBe(true); expect(current().phrases).toEqual([]);
    current().result({ text: '请查询知识库', final: true }); current().onend?.();
    expect(wrapper.emitted('keyword')).toEqual([[{ keyword: { phrase: '知识库' }, transcript: '请查询知识库' }]]);
    expect(wrapper.attributes('data-keyword-boost')).toBe('off');
  });
  it('matches local transcripts without hotword support and normalizes inserted spaces', async () => {
    const wrapper = setup({ mode: 'local', enabled: true, boostKeywords: true, keywords: ['知识库', 'Markdown', '不存在'] });
    await flushPromises(); await down(wrapper);
    expect(current().processLocally).toBe(true); expect(current().phrases).toEqual([]);
    expect(wrapper.attributes('data-keyword-boost')).toBe('unavailable');
    current().result({ text: '知 识 库和 ＭＡＲＫ down', final: true }); current().onend?.(); await nextTick();
    expect(wrapper.emitted('keyword')?.map(args => (args[0] as { keyword: { phrase: string } }).keyword.phrase)).toEqual(['知识库', 'Markdown']);
    expect(wrapper.emitted('result')).toEqual([['知 识 库和 ＭＡＲＫ down']]);
    expect(wrapper.emitted('error')).toBeUndefined();
  });
  it('remembers rejected engine hints and allows the next local session without hints', async () => {
    vi.stubGlobal('SpeechRecognitionPhrase', class { constructor(public phrase: string, public boost: number) {} });
    const wrapper = setup({ mode: 'local', enabled: true, boostKeywords: true, keywords: ['知识库'] }); await flushPromises(); await down(wrapper);
    const rejected = current(); expect(rejected.phrases).toHaveLength(1);
    rejected.onerror?.({ error: 'phrases-not-supported' }); await nextTick();
    expect(wrapper.attributes('data-keyword-boost')).toBe('rejected'); expect(wrapper.text()).toContain('已停用增强');
    expect(wrapper.emitted('result')).toBeUndefined(); expect(rejected.abort).toHaveBeenCalledOnce();
    await down(wrapper); const retry = current(); expect(retry).not.toBe(rejected); expect(retry.phrases).toEqual([]); expect(retry.processLocally).toBe(true);
    retry.onstart?.(); retry.result({ text: '知识库', final: true }); up(); retry.onend?.();
    expect(wrapper.emitted('result')).toEqual([['知识库']]); expect(wrapper.emitted('keyword')).toHaveLength(1);
    await wrapper.setProps({ mode: 'browser' }); await down(wrapper); expect(current().phrases).toHaveLength(1);
  });
  it('continues local dictation if the optional phrase setter throws', async () => {
    vi.stubGlobal('SpeechRecognitionPhrase', class { constructor(public phrase: string, public boost: number) {} });
    vi.stubGlobal('SpeechRecognition', class extends Recognition {
      constructor() { super(); Object.defineProperty(this, 'phrases', { get: () => [], set: () => { throw new DOMException('Unsupported', 'NotSupportedError'); } }); }
    });
    const wrapper = setup({ mode: 'local', enabled: true, boostKeywords: true, keywords: ['知识库'] }); await flushPromises(); await down(wrapper);
    expect(current().start).toHaveBeenCalledOnce(); expect(current().processLocally).toBe(true);
    expect(wrapper.attributes('data-keyword-boost')).toBe('rejected');
    current().result({ text: '知识库', final: true }); current().onend?.(); expect(wrapper.emitted('keyword')).toHaveLength(1);
    expect(wrapper.emitted('error')).toBeUndefined();
  });
  it('falls back to the prefixed constructor, but reports unsupported and insecure environments', async () => {
    vi.stubGlobal('SpeechRecognition', undefined); vi.stubGlobal('webkitSpeechRecognition', Recognition);
    const prefixed = setup({ enabled: true }); await down(prefixed); expect(current().start).toHaveBeenCalledOnce();
    vi.stubGlobal('webkitSpeechRecognition', undefined); const unsupported = setup(); await nextTick(); expect(unsupported.text()).toContain('不支持语音识别');
    vi.stubGlobal('isSecureContext', false); const insecure = setup(); await nextTick(); expect(insecure.text()).toContain('HTTPS');
  });
});

it('renders no built-in controls or copy when no slot is supplied', () => {
  const wrapper = mount(SpeechInput, { props: { mode: 'browser' } }); wrappers.push(wrapper);
  expect(wrapper.element.children).toHaveLength(0); expect(wrapper.text()).toBe(''); expect(wrapper.find('button').exists()).toBe(false);
});

it('only samples volume when opted in and releases a late grant after an early key release', async () => {
  let grant!: (stream: MediaStream) => void;
  const getUserMedia = vi.fn(() => new Promise<MediaStream>(resolve => { grant = resolve; }));
  const close = vi.fn(async () => {});
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  vi.stubGlobal('AudioContext', class { state = 'running'; close = close; });
  const wrapper = setup({ enabled: true }); await down(wrapper); expect(getUserMedia).not.toHaveBeenCalled();
  wrapper.vm.cancel(); await wrapper.setProps({ meter: true });
  await down(wrapper); expect(getUserMedia).toHaveBeenCalledOnce(); expect(wrapper.vm.levelState).toBe('requesting');
  up(); expect(close).toHaveBeenCalledOnce(); expect(wrapper.vm.levelState).toBe('idle');
  const track = { stop: vi.fn() }; grant({ getTracks: () => [track] } as unknown as MediaStream); await flushPromises();
  expect(track.stop).toHaveBeenCalledOnce(); expect(wrapper.vm.level).toBe(0);
  current().onstart?.(); expect(current().stop).toHaveBeenCalledOnce(); expect(getUserMedia).toHaveBeenCalledOnce();
});

it('keeps recognition usable when volume capture is denied and exposes its separate error', async () => {
  const getUserMedia = vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  vi.stubGlobal('AudioContext', class { state = 'running'; close = vi.fn(async () => {}); });
  const wrapper = setup({ enabled: true, meter: true }); await down(wrapper); current().onstart?.(); await flushPromises();
  expect(wrapper.vm.levelState).toBe('error'); expect(wrapper.vm.level).toBe(0);
  expect(wrapper.emitted('level-error')?.[0]).toEqual([expect.objectContaining({ code: 'level-not-allowed' })]);
  expect(wrapper.emitted('error')).toBeUndefined(); expect(wrapper.attributes('data-recording')).toBe('true');
  up(); current().result({ text: '采样失败仍可转写', final: true }); current().onend?.();
  expect(wrapper.emitted('result')).toEqual([['采样失败仍可转写']]);
});

it('exposes recording state and imperative start/stop through the scoped slot', async () => {
  const wrapper = mount(SpeechInput, { attachTo: document.body, props: { mode: 'browser' }, slots: {
    default: (speech: SpeechInputSlotProps) => h('button', { 'data-recording': String(speech.recording), onClick: speech.recording ? speech.stop : speech.start }, speech.recording ? '自定义录音中' : '自定义开始'),
  } }); wrappers.push(wrapper);
  await wrapper.get('button').trigger('click'); expect(wrapper.get('button').attributes('data-recording')).toBe('false');
  const recognition = current(); recognition.onstart?.(); await nextTick();
  expect(wrapper.get('button').attributes('data-recording')).toBe('true'); expect(wrapper.text()).toBe('自定义录音中');
  await wrapper.get('button').trigger('click'); expect(recognition.stop).toHaveBeenCalledOnce();
  expect(wrapper.get('button').attributes('data-recording')).toBe('false');
  recognition.result({ text: '插槽结果', final: true }); recognition.onend?.(); expect(wrapper.emitted('result')).toEqual([['插槽结果。']]);
});

it('inserts external text at the captured selection and preserves undo', async () => {
  const wrapper = mount(MarkdownInput, { attachTo: document.body, props: { modelValue: '前后' } }); wrappers.push(wrapper);
  const editor = wrapper.get('[role="textbox"]').element as HTMLElement;
  editor.focus();
  setSelectionOffsets(editor, 1);
  wrapper.vm.captureSelection(); editor.blur();
  wrapper.vm.insertText('语音');
  expect(wrapper.vm.getText()).toBe('前语音后');
  await wrapper.get('[role="textbox"]').trigger('keydown', { key: 'z', ctrlKey: true, metaKey: true });
  expect(wrapper.vm.getText()).toBe('前后');
});

it('restores the captured selection after a temporary read-only recording session', async () => {
  const wrapper = mount(MarkdownInput, { attachTo: document.body, props: { modelValue: '前后' } }); wrappers.push(wrapper);
  const editor = wrapper.get('[role="textbox"]').element as HTMLElement;
  editor.focus(); setSelectionOffsets(editor, 1); wrapper.vm.captureSelection();
  await wrapper.setProps({ readonly: true });
  setSelectionOffsets(editor, 0); await wrapper.get('[role="textbox"]').trigger('keyup', { key: ' ' });
  await wrapper.setProps({ readonly: false });
  wrapper.vm.insertText('语音。', true);
  expect(wrapper.vm.getText()).toBe('前语音。后');
});
