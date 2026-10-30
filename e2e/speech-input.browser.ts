import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Exercise real keyboard, pointer, editor selection and Vue rendering, while
  // keeping microphone permission and external recognition out of CI.
  await page.addInitScript(() => {
    let active: FakeSpeech | undefined;
    const gains = new Set<GainNode>();
    const service = {
      starts: 0, stops: 0, aborts: 0,
      local: false,
      final: '请查询知识库和 Markdown',
      segments: [] as string[],
      hints: 0,
      rejectHints: false,
      availability: 'available',
      volume: .01, meterStarts: 0, meterStops: 0,
      setVolume(value: number) { this.volume = value; gains.forEach(gain => { gain.gain.value = value; }); },
      installRequests: [] as { langs: string[]; processLocally?: boolean }[],
      interim(text: string) { active?.onresult?.({ results: [{ isFinal: false, 0: { transcript: text } }] }); },
      error(code: string) { active?.onerror?.({ error: code }); },
    };
    class FakeSpeech {
      static available = async () => service.availability;
      static install = async (options: { langs: string[]; processLocally?: boolean }) => {
        service.installRequests.push(options);
        if (options.processLocally !== true) return false;
        service.availability = 'available'; return true;
      };
      processLocally = false;
      phrases: unknown[] = [];
      lang = ''; continuous = false; interimResults = false;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onresult: ((event: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null = null;
      start() {
        active = this; service.starts++; service.local = this.processLocally; service.hints = this.phrases.length;
        queueMicrotask(() => { if (service.rejectHints && this.phrases.length) this.onerror?.({ error: 'phrases-not-supported' }); else this.onstart?.(); });
      }
      stop() {
        service.stops++;
        setTimeout(() => {
          this.onresult?.({ results: (service.segments.length ? service.segments : [service.final]).map(text => ({ isFinal: true, 0: { transcript: text } })) });
          this.onend?.();
        }, 80);
      }
      abort() { service.aborts++; }
    }
    class Phrase { constructor(public phrase: string, public boost: number) {} }
    // Real PCM through Web Audio and MediaStream, with no physical microphone
    // or speaker output. The production AnalyserNode reads this signal.
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
      const context = new AudioContext(); const oscillator = context.createOscillator();
      const gain = context.createGain(); gain.gain.value = service.volume; gains.add(gain);
      const destination = context.createMediaStreamDestination();
      oscillator.connect(gain); gain.connect(destination); oscillator.start(); await context.resume();
      service.meterStarts++;
      for (const track of destination.stream.getTracks()) {
        const stop = track.stop.bind(track); let stopped = false;
        track.stop = () => {
          if (stopped) return; stopped = true; stop(); service.meterStops++;
          gains.delete(gain); oscillator.stop(); oscillator.disconnect(); gain.disconnect(); void context.close();
        };
      }
      return destination.stream;
    } });
    Object.assign(window, { SpeechRecognition: FakeSpeech, SpeechRecognitionPhrase: Phrase, speechTest: service });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '清空', exact: true }).click();
});

test('held Space previews, inserts at the saved caret, detects keywords and supports undo', async ({ page }) => {
  const editor = page.locator('.md-input__editor');
  await editor.fill('前后');
  await page.getByLabel('空格语音模式', { exact: true }).check();
  await editor.focus();
  await editor.evaluate(element => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT); const text = walker.nextNode()!;
    const range = document.createRange(); range.setStart(text, 1); range.collapse(true);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
  });
  await page.keyboard.down('Space');
  await expect(page.locator('.speech-input')).toHaveAttribute('data-state', 'listening');
  await page.evaluate(() => (window as unknown as { speechTest: { interim(text: string): void } }).speechTest.interim('正在查找知识库'));
  await expect(page.getByLabel('语音识别预览')).toHaveText('正在查找知识库');
  await expect(page.getByTestId('draft-json')).toHaveText('前后');
  await page.keyboard.up('Space');
  await expect(page.getByTestId('draft-json')).toHaveText('前请查询知识库和 Markdown。后');
  await expect(page.locator('.input-lab__speech-matches')).toHaveText('识别到关键词：知识库、Markdown');
  expect(await page.evaluate(() => (window as unknown as { speechTest: { local: boolean } }).speechTest.local)).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { speechTest: { hints: number } }).speechTest.hints)).toBe(0);
  await editor.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
  await expect(page.getByTestId('draft-json')).toHaveText('前后');
});

test('ordinary Space and mention query keep their original behavior', async ({ page }) => {
  const editor = page.locator('.md-input__editor');
  await editor.fill('正常'); await editor.press('End'); await editor.press('Space');
  await expect(page.getByTestId('draft-json')).toHaveText('正常 ');
  await page.getByLabel('空格语音模式', { exact: true }).check();
  await editor.focus(); await editor.press('Control+u');
  const query = page.getByRole('textbox', { name: '搜索引用', exact: true });
  await query.press('Space'); await expect(page.getByRole('listbox')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { speechTest: { starts: number } }).speechTest.starts)).toBe(0);
});

test('microphone button works with pointer release outside and preserves mention nodes', async ({ page }) => {
  const editor = page.locator('.md-input__editor');
  await editor.focus(); await editor.press('Control+u'); await page.keyboard.press('Enter');
  const microphone = page.getByRole('button', { name: '按住说话', exact: true });
  await microphone.hover(); await page.mouse.down();
  await expect(page.locator('.speech-input')).toHaveAttribute('data-state', 'listening');
  await page.mouse.move(5, 5); await page.mouse.up();
  await expect(page.getByTestId('draft-json')).toContainText('请查询知识库和 Markdown');
  await expect(editor.locator('[data-mention]')).toContainText('林见微');
  expect(await page.evaluate(() => (window as unknown as { speechTest: { stops: number } }).speechTest.stops)).toBe(1);
});

test('Escape discards text, error recovers, and explicit browser mode may use the default service', async ({ page }) => {
  const editor = page.locator('.md-input__editor');
  await page.locator('.input-lab__speech-settings select').first().selectOption('browser');
  await page.getByLabel('空格语音模式', { exact: true }).check();
  await editor.focus(); await page.keyboard.down('Space');
  await expect(page.locator('.speech-input')).toHaveAttribute('data-state', 'listening');
  await page.keyboard.press('Escape'); await page.keyboard.up('Space');
  await expect(page.getByTestId('node-output')).toHaveText('[]');
  await editor.focus(); await page.keyboard.down('Space');
  await page.evaluate(() => (window as unknown as { speechTest: { error(code: string): void } }).speechTest.error('not-allowed'));
  await page.keyboard.up('Space');
  await expect(page.locator('.speech-input__status')).toContainText('麦克风权限被拒绝');
  await editor.focus(); await page.keyboard.down('Space'); await page.keyboard.up('Space');
  await expect(page.getByTestId('draft-json')).toHaveText('请查询知识库和 Markdown。');
  await expect(page.locator('.speech-input__privacy')).toContainText('语音可能发送给浏览器厂商');
  expect(await page.evaluate(() => (window as unknown as { speechTest: { local: boolean } }).speechTest.local)).toBe(false);
  await page.screenshot({ path: 'test-results/speech-input.png', fullPage: true });
});

test('basic punctuation follows final segments, preserves existing punctuation and can be disabled', async ({ page }) => {
  await page.evaluate(() => { (window as unknown as { speechTest: { segments: string[] } }).speechTest.segments = ['第一句话', '第二句话？']; });
  const mic = page.getByRole('button', { name: '按住说话', exact: true });
  await mic.focus(); await page.keyboard.down('Space'); await page.keyboard.up('Space');
  await expect(page.getByTestId('draft-json')).toHaveText('第一句话。第二句话？');
  await page.getByRole('button', { name: '清空', exact: true }).click();
  await page.getByLabel('自动标点', { exact: true }).uncheck();
  await mic.focus(); await page.keyboard.down('Space'); await page.keyboard.up('Space');
  await expect(page.getByTestId('draft-json')).toHaveText('第一句话第二句话？');
});

test('unsupported hotword hints do not prevent subsequent local keyword matching', async ({ page }) => {
  await page.getByLabel('热词增强（实验）', { exact: true }).check();
  await page.evaluate(() => { (window as unknown as { speechTest: { rejectHints: boolean } }).speechTest.rejectHints = true; });
  const microphone = page.getByRole('button', { name: '按住说话', exact: true });
  await microphone.focus(); await page.keyboard.down('Space'); await page.keyboard.up('Space');
  await expect(page.locator('.speech-input__status')).toContainText('不支持热词增强');
  await expect(page.locator('.speech-input')).toHaveAttribute('data-keyword-boost', 'rejected');
  await expect(page.getByTestId('node-output')).toHaveText('[]');
  await microphone.focus(); await page.keyboard.down('Space');
  await expect(page.locator('.speech-input')).toHaveAttribute('data-state', 'listening');
  await page.keyboard.up('Space');
  await expect(page.getByTestId('draft-json')).toHaveText('请查询知识库和 Markdown。');
  await expect(page.locator('.input-lab__speech-matches')).toHaveText('识别到关键词：知识库、Markdown');
  expect(await page.evaluate(() => (window as unknown as { speechTest: { hints: number; local: boolean } }).speechTest)).toMatchObject({ hints: 0, local: true });
});

test('installing a downloadable local pack explicitly requests processLocally', async ({ page }) => {
  await page.evaluate(() => { (window as unknown as { speechTest: { availability: string } }).speechTest.availability = 'downloadable'; });
  await page.getByRole('button', { name: '重新检测', exact: true }).click();
  await page.getByRole('button', { name: '安装语言包', exact: true }).click();
  await expect(page.locator('.speech-input')).toHaveAttribute('data-state', 'idle');
  await expect(page.getByRole('button', { name: '按住说话', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { speechTest: { installRequests: unknown[] } }).speechTest.installRequests)).toEqual([{ langs: ['zh-CN'], processLocally: true }]);
  await expect(page.getByRole('button', { name: '安装语言包', exact: true })).toHaveCount(0);
});

test('the host slot swaps content using recording state and renders a configurable Canvas wave', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const microphone = page.getByRole('button', { name: '按住说话', exact: true });
  const wave = page.locator('canvas.speech-wave');
  await expect(wave).toHaveCount(0);
  await microphone.focus(); await page.keyboard.down('Space');
  await expect(page.locator('.speech-input')).toHaveAttribute('data-recording', 'true');
  await expect(microphone).toHaveText('松开结束'); await expect(wave).toHaveAttribute('data-active', 'true');
  const first = await wave.evaluate(element => (element as HTMLCanvasElement).toDataURL());
  await expect.poll(() => wave.evaluate(element => (element as HTMLCanvasElement).toDataURL())).not.toBe(first);
  await page.getByLabel('主色', { exact: true }).evaluate(element => {
    (element as HTMLInputElement).value = '#ff0000'; element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect.poll(() => wave.evaluate(element => {
    const canvas = element as HTMLCanvasElement;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const pixel = canvas.getContext('2d')!.getImageData(Math.round(2 * ratio), Math.round(canvas.height / 2), 1, 1).data;
    return pixel[0] > 200 && pixel[2] < 100;
  })).toBe(true);
  await page.screenshot({ path: 'test-results/speech-slot-wave.png', fullPage: true });
  await page.keyboard.up('Space');
  await expect(page.locator('.speech-input')).toHaveAttribute('data-recording', 'false'); await expect(wave).toHaveCount(0);
});

test('the Canvas honors reduced-motion without changing recognition controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => (window as unknown as { speechTest: { setVolume(value: number): void } }).speechTest.setVolume(0));
  await page.getByRole('button', { name: '按住说话', exact: true }).focus(); await page.keyboard.down('Space');
  const wave = page.locator('canvas.speech-wave'); await expect(wave).toBeVisible();
  const first = await wave.evaluate(element => (element as HTMLCanvasElement).toDataURL());
  await page.evaluate(() => (window as unknown as { speechTest: { interim(text: string): void } }).speechTest.interim('更新预览'));
  await expect(page.getByLabel('语音识别预览')).toHaveText('更新预览');
  expect(await wave.evaluate(element => (element as HTMLCanvasElement).toDataURL())).toBe(first);
  await page.keyboard.up('Space'); await expect(wave).toHaveCount(0);
});

test('measured audio drives waveform amplitude, silence settles, and release closes the stream', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: '按住说话', exact: true }).focus(); await page.keyboard.down('Space');
  const wave = page.locator('canvas.speech-wave'); await expect(wave).toBeVisible();
  const level = () => wave.evaluate(element => Number(element.getAttribute('data-level')));
  const height = () => wave.evaluate(element => {
    const canvas = element as HTMLCanvasElement;
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let min = canvas.height, max = -1;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      if (pixels[(y * canvas.width + x) * 4 + 3] > 20) { min = Math.min(min, y); max = Math.max(max, y); }
    }
    return max - min + 1;
  });
  await expect.poll(level).toBeGreaterThan(.2); await expect.poll(level).toBeLessThan(.4);
  const quietHeight = await height();
  await page.evaluate(() => (window as unknown as { speechTest: { setVolume(value: number): void } }).speechTest.setVolume(.6));
  await expect.poll(level).toBeGreaterThan(.75); await expect.poll(height).toBeGreaterThan(quietHeight + 6);
  await page.screenshot({ path: 'test-results/speech-volume-loud.png', fullPage: true });
  await page.evaluate(() => (window as unknown as { speechTest: { setVolume(value: number): void } }).speechTest.setVolume(0));
  await expect.poll(level).toBe(0); await expect.poll(height).toBeLessThanOrEqual(4);
  await page.keyboard.up('Space'); await expect(wave).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const service = (window as unknown as { speechTest: { meterStarts: number; meterStops: number } }).speechTest;
    return service.meterStarts > 0 && service.meterStarts === service.meterStops;
  })).toBe(true);
});
