import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { localSpeechPolicyAllowed, speechBrowser, type BrowserSpeechRecognition } from './browser';
import { formatSpeechSegments } from './transcript';
import type { SpeechInputAvailability, SpeechInputError, SpeechInputProps, SpeechInputState, SpeechKeywordMatch, SpeechKeywordBoostState } from './types';

function normalizeKeyword(text: string) { return text.normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ''); }
function browserException(cause: unknown): { name: string; message: string } | undefined {
  if (cause && typeof cause === 'object') {
    const value = cause as { name?: unknown; message?: unknown };
    if (typeof value.message === 'string') return { name: typeof value.name === 'string' ? value.name : 'Error', message: value.message };
  }
  return typeof cause === 'string' ? { name: 'Error', message: cause } : undefined;
}

const errors: Record<string, string> = {
  'not-allowed': '麦克风权限被拒绝，请在浏览器设置中允许访问。',
  'service-not-allowed': '浏览器不允许使用此语音识别服务。',
  'audio-capture': '无法访问麦克风，请检查设备是否可用。',
  'no-speech': '没有识别到语音，请按住后再试一次。',
  network: '语音服务连接失败，请检查网络或切换识别方式。',
  'language-not-supported': '当前浏览器尚不支持此语言的识别。',
  'phrases-not-supported': '当前识别服务不支持热词增强，已停用增强。请重新按住说话，转写后仍可匹配关键词。',
  timeout: '语音服务响应超时，请重试。',
  unsupported: '当前浏览器不支持语音识别。',
  insecure: '请在 HTTPS 或 localhost 页面使用语音输入。',
  'local-unavailable': '本地语言包不可用，可尝试其他语言或选择浏览器服务。',
  'local-api-unsupported': '当前浏览器没有提供本地语音识别接口，无法安装识别语言包。',
  'local-policy-blocked': '当前页面的 Permissions-Policy 禁止本地语音识别，请在独立页面打开或调整嵌入页面权限。',
  'install-not-allowed': '浏览器拒绝安装。请直接点击安装按钮，并确认页面允许安装本地识别语言包。',
  'install-invalid-state': '当前页面不是活动页面，请切回此页面再点击安装。',
  'install-invalid-language': '浏览器拒绝了语言标记或安装参数，请检查所选语言。',
  'install-failed': '浏览器返回安装失败（false），没有提供具体原因。请检查浏览器的组件下载状态和网络后重试。',
};

export function useSpeechInput(props: SpeechInputProps, emit: {
  (event: 'result', transcript: string): void;
  (event: 'interim', transcript: string): void;
  (event: 'keyword', match: SpeechKeywordMatch): void;
  (event: 'state-change', state: SpeechInputState): void;
  (event: 'error', error: SpeechInputError): void;
}) {
  const state = ref<SpeechInputState>('idle');
  const availability = ref<SpeechInputAvailability>('unsupported');
  const preview = ref('');
  const error = ref<SpeechInputError>();
  const keywords = computed(() => (props.keywords ?? []).map(item => typeof item === 'string' ? { phrase: item } : { ...item }).filter(item => normalizeKeyword(item.phrase)));
  const boostInterface = ref(false);
  const boostRejected = ref(false);
  const boostRequested = ref(false);
  const keywordBoost = computed<SpeechKeywordBoostState>(() => {
    if (!props.boostKeywords || !keywords.value.length) return 'off';
    if (boostRejected.value) return 'rejected';
    if (!boostInterface.value) return 'unavailable';
    return boostRequested.value ? 'requested' : 'ready';
  });
  const busy = computed(() => ['starting', 'listening', 'stopping'].includes(state.value));
  const canStart = computed(() => !props.disabled && availability.value === 'available' && !busy.value && state.value !== 'checking' && state.value !== 'installing');
  let recognition: BrowserSpeechRecognition | undefined;
  let generation = 0;
  let mounted = false;
  let stopRequested = false;
  let finalSegments: string[] = [];
  let sessionKeywords = keywords.value;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function clearTimer() { clearTimeout(timer); timer = undefined; }
  function detach(current: BrowserSpeechRecognition) {
    current.onstart = current.onend = current.onerror = current.onresult = null;
  }
  function cancel() {
    const current = recognition;
    recognition = undefined;
    clearTimer();
    if (current) { detach(current); try { current.abort(); } catch { /* Already ended. */ } }
    preview.value = ''; finalSegments = []; stopRequested = false;
    if (busy.value) state.value = 'idle';
  }
  function fail(code: string, cause?: unknown) {
    cancel();
    const detail = browserException(cause);
    error.value = { code, message: errors[code] ?? `语音识别失败（${code}），请重试。`, ...(detail ? { cause: detail } : {}) };
    state.value = 'error'; emit('error', error.value);
  }
  function armTimeout(ms: number) { clearTimer(); timer = setTimeout(() => fail('timeout'), ms); }
  function constructor() { const browser = speechBrowser(); return browser.SpeechRecognition ?? browser.webkitSpeechRecognition; }
  async function refresh() {
    cancel();
    const token = ++generation;
    error.value = undefined;
    availability.value = 'unsupported';
    boostInterface.value = false; boostRejected.value = false; boostRequested.value = false;
    state.value = 'checking';
    if (window.isSecureContext === false) { fail('insecure'); return; }
    const Recognition = constructor();
    if (!Recognition) { fail('unsupported'); return; }
    let probe: BrowserSpeechRecognition;
    try {
      probe = new Recognition();
      boostInterface.value = 'phrases' in probe && typeof speechBrowser().SpeechRecognitionPhrase === 'function';
    } catch { fail('unsupported'); return; }
    if (props.mode !== 'local') { availability.value = 'available'; state.value = 'idle'; return; }
    try {
      if (!Recognition.available || !('processLocally' in probe)) {
        availability.value = 'unsupported'; fail('local-api-unsupported'); return;
      }
      if (localSpeechPolicyAllowed() === false) { availability.value = 'unavailable'; fail('local-policy-blocked'); return; }
      const result = await Recognition.available({ langs: [props.lang ?? 'zh-CN'], processLocally: true });
      if (!mounted || token !== generation) return;
      availability.value = result;
      state.value = 'idle';
      if (result === 'unavailable') fail('local-unavailable');
    } catch (cause) {
      if (mounted && token === generation) { availability.value = 'unavailable'; fail('local-unavailable', cause); }
    }
  }
  async function install() {
    if (props.disabled || state.value === 'checking' || state.value === 'installing' || busy.value || props.mode !== 'local') return;
    const Recognition = constructor();
    if (!Recognition?.install) { fail('local-api-unsupported'); return; }
    if (localSpeechPolicyAllowed() === false) { fail('local-policy-blocked'); return; }
    const token = ++generation;
    state.value = 'installing'; error.value = undefined;
    try {
      // Chrome resolves false without processLocally, even for downloadable packs.
      // Call directly in the click task, before awaiting anything, to retain activation.
      const installed = await Recognition.install({ langs: [props.lang ?? 'zh-CN'], processLocally: true });
      if (!mounted || token !== generation) return;
      if (installed) await refresh(); else fail('install-failed');
    } catch (cause) {
      if (!mounted || token !== generation) return;
      const name = browserException(cause)?.name ?? '';
      const code = name === 'NotAllowedError' ? 'install-not-allowed'
        : name === 'InvalidStateError' ? 'install-invalid-state'
        : name === 'SyntaxError' || name === 'TypeError' ? 'install-invalid-language' : 'install-failed';
      fail(code, cause);
    }
  }
  function stop() {
    if (!recognition || stopRequested) return;
    stopRequested = true;
    if (state.value === 'starting') return; // Permission/start may finish after key release.
    state.value = 'stopping'; armTimeout(10000);
    try { recognition.stop(); } catch { fail('stop-failed'); }
  }
  function start() {
    if (!canStart.value) return false;
    error.value = undefined; preview.value = ''; finalSegments = []; stopRequested = false;
    sessionKeywords = keywords.value;
    const lang = props.lang ?? 'zh-CN';
    const punctuation = props.punctuation !== false;
    let hintsApplied = false;
    boostRequested.value = false;
    try {
      const Recognition = constructor()!;
      const current = new Recognition();
      recognition = current;
      current.lang = lang;
      current.continuous = true; current.interimResults = true;
      if ('unspokenPunctuation' in current) current.unspokenPunctuation = punctuation;
      if (props.mode === 'local') {
        if (!('processLocally' in current)) { fail('local-unavailable'); return false; }
        current.processLocally = true;
      } else if ('processLocally' in current) current.processLocally = false;
      const Phrase = speechBrowser().SpeechRecognitionPhrase;
      boostInterface.value = !!Phrase && 'phrases' in current;
      if (props.boostKeywords && !boostRejected.value && Phrase && 'phrases' in current && sessionKeywords.length) {
        try {
          current.phrases = sessionKeywords.map(item => new Phrase(item.phrase, Number.isFinite(item.boost) ? Math.min(10, Math.max(0, item.boost!)) : 5));
          boostRequested.value = true;
          hintsApplied = true;
        } catch {
          // Hints are optional: a rejected setter must not block basic dictation.
          boostRejected.value = true;
        }
      }
      current.onstart = () => {
        if (recognition !== current) return;
        clearTimer();
        state.value = 'listening';
        if (stopRequested) { stopRequested = false; stop(); }
        else timer = setTimeout(stop, 60000);
      };
      current.onresult = event => {
        if (recognition !== current) return;
        const final: string[] = [], interim: string[] = [];
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) final.push(result[0].transcript);
          else interim.push(result[0].transcript);
        }
        finalSegments = final;
        const settled = formatSpeechSegments(final, lang, punctuation);
        const draft = formatSpeechSegments(interim, lang, false);
        preview.value = [settled, draft].filter(Boolean).join(/^(zh|ja)(-|$)/i.test(lang) ? '' : ' ');
        emit('interim', preview.value);
      };
      current.onerror = event => {
        if (recognition !== current) return;
        if (event.error === 'phrases-not-supported' && hintsApplied) boostRejected.value = true;
        fail(event.error);
      };
      current.onend = () => {
        if (recognition !== current) return;
        clearTimer(); detach(current); recognition = undefined;
        const transcript = formatSpeechSegments(finalSegments, lang, punctuation);
        const rawTranscript = formatSpeechSegments(finalSegments, lang, false);
        const matchedKeywords = sessionKeywords;
        finalSegments = []; stopRequested = false; preview.value = '';
        state.value = 'idle';
        if (!transcript) { fail('no-speech'); return; }
        emit('result', transcript);
        const normalized = normalizeKeyword(rawTranscript);
        matchedKeywords.forEach(keyword => {
          if (normalized.includes(normalizeKeyword(keyword.phrase))) emit('keyword', { keyword, transcript });
        });
      };
      state.value = 'starting'; armTimeout(15000);
      current.start();
      return true;
    } catch { fail('start-failed'); return false; }
  }
  watch(state, value => emit('state-change', value));
  watch(() => [props.lang, props.mode], () => { if (mounted) void refresh(); });
  watch(() => props.disabled, value => { if (value) cancel(); });
  watch(() => props.boostKeywords, () => { boostRejected.value = false; boostRequested.value = false; });
  onMounted(() => { mounted = true; void refresh(); });
  onBeforeUnmount(() => { mounted = false; generation++; cancel(); });
  return { state, availability, preview, error, busy, canStart, keywordBoost, keywords, start, stop, cancel, refresh, install };
}
