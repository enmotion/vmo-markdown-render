import { expect, test } from '@playwright/test';

test('标准和高级图片、音视频显式协议：实际资源加载与百分比等比布局', async ({ page }) => {
  // 用浏览器生成真实小视频，不依赖外网、编解码命令或伪造 metadata。
  await page.goto('/e2e/fixtures/theme.html');
  const video = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
    const context = canvas.getContext('2d')!;
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    const chunks: Blob[] = [];
    recorder.ondataavailable = event => chunks.push(event.data);
    const result = new Promise<number[]>(resolve => { recorder.onstop = async () => {
      resolve([...new Uint8Array(await new Blob(chunks).arrayBuffer())]);
      stream.getTracks().forEach(track => track.stop());
    }; });
    recorder.start();
    const timer = setInterval(() => { context.fillStyle = '#345678'; context.fillRect(0, 0, 320, 180); }, 50);
    await new Promise(resolve => setTimeout(resolve, 500)); clearInterval(timer); recorder.stop();
    return result;
  });
  await page.route('**/media/image.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="blue"/></svg>' }));
  await page.route('**/media/video*.webm', route => route.fulfill({ contentType: 'video/webm', body: Buffer.from(video) }));
  const audio = Buffer.alloc(44 + 1600);
  audio.write('RIFF'); audio.writeUInt32LE(audio.length - 8, 4); audio.write('WAVEfmt ', 8);
  audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22);
  audio.writeUInt32LE(8000, 24); audio.writeUInt32LE(16000, 28); audio.writeUInt16LE(2, 32); audio.writeUInt16LE(16, 34);
  audio.write('data', 36); audio.writeUInt32LE(1600, 40);
  await page.route('**/media/audio.wav', route => route.fulfill({ contentType: 'audio/wav', body: audio }));
  await page.goto('/e2e/fixtures/media.html');
  const images = page.locator('.markdown-render img');
  await expect(images).toHaveCount(3);
  for (const [index, width] of [600, 360, 600].entries()) {
    const img = images.nth(index); await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveJSProperty('naturalWidth', 400);
    const box = (await img.boundingBox())!;
    expect(box.width).toBeCloseTo(width, 0); expect(box.height).toBeCloseTo(width / 2, 0);
  }
  await expect(images.nth(0)).toHaveAttribute('title', '标准图片标题');
  await expect(images.nth(1)).toHaveAttribute('title', '高级图片标题');
  await expect(page.locator('audio')).toHaveJSProperty('readyState', 4);
  await expect(page.locator('audio')).toHaveJSProperty('controls', true);
  expect((await page.locator('audio').boundingBox())!.width).toBeCloseTo(600, 0);
  for (const [index, width] of [600, 480, 600].entries()) {
    const el = page.locator('video').nth(index); await el.scrollIntoViewIfNeeded();
    await expect(el).toHaveJSProperty('videoWidth', 320);
    await expect(el).toHaveJSProperty('autoplay', false);
    const box = (await el.boundingBox())!;
    expect(box.width).toBeCloseTo(width, 0); expect(box.height).toBeCloseTo(width * 180 / 320, 0);
  }
  await expect(page.locator('video').nth(1)).toHaveAttribute('poster', '/media/image.svg');
  await page.getByRole('button', { name: '切换视频', exact: true }).click();
  for (const el of await page.locator('video').all()) {
    await expect(el).toHaveJSProperty('videoWidth', 320);
    await expect.poll(() => el.evaluate(video => (video as HTMLVideoElement).currentSrc)).toContain('video-next.webm');
  }
});

test('演示工作台同时展示标准全宽图片和高级百分比图片', async ({ page }) => {
  await page.goto('/?view=render');
  const standard = page.getByRole('img', { name: '紫色山峰与日出的示例插图', exact: true });
  const advanced = page.getByRole('img', { name: '高级协议山峰插图', exact: true });
  for (const image of [standard, advanced]) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('naturalWidth', 1774);
  }
  const full = (await standard.boundingBox())!, partial = (await advanced.boundingBox())!;
  expect(partial.width / full.width).toBeCloseTo(.6, 2);
  expect(full.height / full.width).toBeCloseTo(887 / 1774, 2);
  expect(partial.height / partial.width).toBeCloseTo(887 / 1774, 2);
  await advanced.screenshot({ path: 'test-results/media-advanced-image.png' });
});
