import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const local = { voiceURI: 'local-zh', name: '本地测试中文', lang: 'zh-CN', localService: true, default: true };
    const english = { voiceURI: 'local-en', name: 'Local English', lang: 'en-US', localService: true, default: false };
    const remote = { voiceURI: 'remote-zh', name: '远端测试声音', lang: 'zh-CN', localService: false, default: false };
    class Utterance {
      voice: typeof local | null = null;
      lang = ''; rate = 1; pitch = 1; volume = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      constructor(public text: string) {}
    }
    const service = {
      spoken: [] as { text: string; local: boolean; voiceURI: string; rate: number }[],
      cancels: 0, pauses: 0, resumes: 0, autoEnd: true,
      end() { const current = engine.current; engine.current = undefined; engine.speaking = false; current?.onend?.(); },
      remoteOnly() { engine.voices = [remote]; engine.dispatchEvent(new Event('voiceschanged')); },
      addLocal() { engine.voices = [remote, local, english]; engine.dispatchEvent(new Event('voiceschanged')); },
      fail(code: string) { engine.current?.onerror?.({ error: code }); },
    };
    class Synthesis extends EventTarget {
      voices = [remote, local, english]; current?: Utterance;
      speaking = false; pending = false; paused = false;
      getVoices() { return this.voices; }
      speak(utterance: Utterance) {
        this.current = utterance; this.speaking = true;
        service.spoken.push({ text: utterance.text, local: !!utterance.voice?.localService, voiceURI: utterance.voice?.voiceURI ?? '', rate: utterance.rate });
        queueMicrotask(() => { if (this.current === utterance) utterance.onstart?.(); });
        setTimeout(() => { if (service.autoEnd && this.current === utterance && !this.paused) service.end(); }, 100);
      }
      cancel() { service.cancels++; this.current = undefined; this.speaking = false; }
      pause() { service.pauses++; this.paused = true; }
      resume() { service.resumes++; this.paused = false; }
    }
    const engine = new Synthesis();
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: engine });
    Object.assign(window, { SpeechSynthesisUtterance: Utterance, ttsTest: service });
  });
  await page.goto('/?view=tts');
});

test('streams incremental fragments through the class and flushes the unpunctuated tail locally', async ({ page }) => {
  await page.getByLabel('朗读文本', { exact: true }).fill('你好。第二句。尾段');
  await page.getByRole('button', { name: '流式朗读', exact: true }).click();
  await expect(page.locator('.tts-lab')).toHaveAttribute('data-state', 'ended');
  await expect(page.getByTestId('tts-received')).toHaveText('你好。第二句。尾段');
  await expect(page.getByTestId('tts-chunks').locator('li')).toHaveCount(3);
  const spoken = await page.evaluate(() => (window as unknown as { ttsTest: { spoken: { text: string; local: boolean }[] } }).ttsTest.spoken);
  expect(spoken.map(chunk => chunk.text)).toEqual(['你好。', '第二句。', '尾段']); expect(spoken.every(chunk => chunk.local)).toBe(true);
  await expect(page.getByLabel('本地声音', { exact: true }).locator('option')).toHaveCount(3);
  await expect(page.getByLabel('本地声音', { exact: true })).not.toContainText('远端测试声音');
});

test('cumulative updates are read once and voice/rate settings are applied', async ({ page }) => {
  await page.getByLabel('update 累计全文', { exact: true }).check();
  await page.getByLabel('本地声音', { exact: true }).selectOption('local-en');
  const rate = page.getByRole('slider', { name: /^语速/ });
  await rate.press('Home');
  for (let i = 0; i < 8; i++) await rate.press('ArrowRight');
  await page.getByLabel('朗读文本', { exact: true }).fill('Hello world. Tail');
  await page.getByRole('button', { name: '流式朗读', exact: true }).click();
  await expect(page.locator('.tts-lab')).toHaveAttribute('data-state', 'ended');
  const spoken = await page.evaluate(() => (window as unknown as { ttsTest: { spoken: { text: string; voiceURI: string; rate: number }[] } }).ttsTest.spoken);
  expect(spoken.map(chunk => chunk.text)).toEqual(['Hello world.', 'Tail']);
  expect(spoken.every(chunk => chunk.voiceURI === 'local-en' && chunk.rate === 1.3)).toBe(true);
  await page.screenshot({ path: 'test-results/local-tts.png', fullPage: true });
});

test('pause, resume and stop operate on the instance and discard queued text', async ({ page }) => {
  await page.evaluate(() => { (window as unknown as { ttsTest: { autoEnd: boolean } }).ttsTest.autoEnd = false; });
  await page.getByLabel('朗读文本', { exact: true }).fill('第一句。第二句。');
  await page.getByRole('button', { name: '整段朗读', exact: true }).click();
  await expect(page.locator('.tts-lab')).toHaveAttribute('data-state', 'speaking');
  await page.getByRole('button', { name: '暂停朗读', exact: true }).click(); await expect(page.locator('.tts-lab')).toHaveAttribute('data-state', 'paused');
  await page.getByRole('button', { name: '继续朗读', exact: true }).click(); await expect(page.locator('.tts-lab')).toHaveAttribute('data-state', 'speaking');
  await page.getByRole('button', { name: '停止朗读', exact: true }).click(); await expect(page.locator('.tts-lab')).toHaveAttribute('data-state', 'stopped');
  const state = await page.evaluate(() => (window as unknown as { ttsTest: { spoken: unknown[]; cancels: number; pauses: number; resumes: number } }).ttsTest);
  expect(state.spoken).toHaveLength(1); expect(state).toMatchObject({ cancels: 1, pauses: 1, resumes: 1 });
  await page.getByLabel('朗读文本', { exact: true }).fill('新消息。'); await page.getByRole('button', { name: '整段朗读', exact: true }).click();
  await expect(page.getByTestId('tts-chunks')).toContainText('新消息。');
  await expect(page.getByTestId('tts-chunks')).not.toContainText('第二句。');
});

test('missing local voices disables playback and voiceschanged restores it without remote fallback', async ({ page }) => {
  await page.evaluate(() => (window as unknown as { ttsTest: { remoteOnly(): void } }).ttsTest.remoteOnly());
  await expect(page.getByRole('button', { name: '流式朗读', exact: true })).toBeDisabled();
  await expect(page.locator('.tts-lab__error')).toContainText('没有可用的指定本地声音');
  await page.evaluate(() => (window as unknown as { ttsTest: { addLocal(): void } }).ttsTest.addLocal());
  await expect(page.getByRole('button', { name: '流式朗读', exact: true })).toBeEnabled();
});

test('native errors are shown and leaving the TTS tab cancels the current stream', async ({ page }) => {
  await page.evaluate(() => { (window as unknown as { ttsTest: { autoEnd: boolean } }).ttsTest.autoEnd = false; });
  await page.getByLabel('朗读文本', { exact: true }).fill('第一句。第二句。'); await page.getByRole('button', { name: '整段朗读', exact: true }).click();
  await page.evaluate(() => (window as unknown as { ttsTest: { fail(code: string): void } }).ttsTest.fail('not-allowed'));
  await expect(page.getByRole('alert')).toContainText('not-allowed');
  await expect(page.locator('.tts-lab')).toHaveAttribute('data-state', 'error');
  await page.getByRole('button', { name: '整段朗读', exact: true }).click();
  await page.getByRole('button', { name: '聊天输入', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { ttsTest: { cancels: number } }).ttsTest.cancels)).toBe(2);
});
