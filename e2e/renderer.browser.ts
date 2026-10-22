import { expect, test } from '@playwright/test';

test('真实浏览器验证增强内容、主题、缩放、流式与窄屏', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.md-math .katex').first()).toBeVisible();
  await expect(page.locator('.md-mermaid svg')).toBeVisible();
  await expect(page.locator('.md-code-block .hljs-keyword').first()).toBeVisible();
  await expect(page.locator('.demo-card')).toBeVisible();
  await expect(page.locator('.markdown-render')).toContainText('姓名：张三；订单：订单 123');
  const colors = await page.locator('.markdown-render').evaluate(element => {
    const style = getComputedStyle(element);
    const heading = getComputedStyle(element.querySelector('h1')!);
    const info = getComputedStyle(element.querySelector('.md-alert-info .md-alert-title')!);
    const probe = document.createElement('span');
    element.append(probe);
    const resolve = (name: string) => { probe.style.color = `var(--md-${name})`; return getComputedStyle(probe).color; };
    const expectedPrimary = resolve('primary');
    const expectedInfo = resolve('info');
    probe.remove();
    return { primary: style.getPropertyValue('--md-default-primary').trim(), heading: heading.color, info: info.color, expectedPrimary, expectedInfo };
  });
  expect(colors.heading).toBe(colors.expectedPrimary);
  expect(colors.info).toBe(colors.expectedInfo);
  await page.locator('select').selectOption('dark');
  await expect(page.locator('.markdown-render')).toHaveAttribute('data-theme', 'dark');
  const oldSize = await page.locator('.markdown-render__content').evaluate(element => getComputedStyle(element).fontSize);
  await page.locator('input[type="range"]').fill('18');
  const newSize = await page.locator('.markdown-render__content').evaluate(element => getComputedStyle(element).fontSize);
  expect(parseFloat(newSize)).toBeCloseTo(parseFloat(oldSize) * 1.5);
  await page.getByRole('button', { name: '模拟流式', exact: true }).click();
  await expect(page.locator('.demo-status')).toHaveText('完整文档', { timeout: 15000 });
  await expect(page.locator('.md-mermaid svg')).toBeVisible();
  await page.locator('.demo-card button').click();
  await expect(page.locator('.demo-card button')).toHaveText('交互次数 1');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/markdown-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/markdown-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});


test('主色覆盖、自动主题、错误降级和代码复制', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.locator('select').selectOption('auto');
  await expect(page.locator('.markdown-render')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('.markdown-render')).toHaveAttribute('data-theme', 'light');
  const colors = await page.locator('.markdown-render').evaluate(element => {
    (element as HTMLElement).style.setProperty('--md-primary', '#ff00ff');
    return ['h1', '.md-alert-info .md-alert-title', '.md-alert-success .md-alert-title', '.md-alert-danger .md-alert-title'].map(selector => getComputedStyle(element.querySelector(selector)!).color);
  });
  expect(new Set(colors).size).toBe(4);
  expect(colors[0]).toBe('rgb(255, 0, 255)');
  expect(await page.locator('.md-alert-danger svg').evaluate(element => getComputedStyle(element).stroke)).toBe(colors[3]);
  await page.locator('.md-code-block button').first().click();
  await expect(page.locator('.md-code-block button').first()).toHaveText('已复制');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('const greeting');
  await page.getByRole('textbox', { name: 'Markdown 源码' }).fill('正文仍可读\n\n```mermaid\nnot valid diagram syntax\n```\n\n$$\n\\notAValidCommand\n$$');
  await expect(page.locator('.markdown-render')).toContainText('正文仍可读');
  await expect(page.locator('.md-code-block small')).toHaveCount(2);
  await expect(page.locator('.md-code-block pre').first()).toContainText('not valid diagram syntax');
});


test('字号只作用于内容，项目字号和外层布局保持固定', async ({ page }) => {
  await page.goto('/');
  const measure = () => page.evaluate(() => {
    const dimensions = (selector: string) => {
      const element = document.querySelector(selector)!;
      const rect = element.getBoundingClientRect();
      const css = getComputedStyle(element);
      return { width: rect.width, height: rect.height, font: css.fontSize, padding: css.padding };
    };
    return {
      html: getComputedStyle(document.documentElement).fontSize,
      body: getComputedStyle(document.body).fontSize,
      header: dimensions('.demo-header'), toolbar: dimensions('.demo-toolbar'),
      source: dimensions('.demo-source'), preview: dimensions('.demo-preview'),
      shellFont: getComputedStyle(document.querySelector('.markdown-render')!).fontSize,
      shellPadding: getComputedStyle(document.querySelector('.markdown-render')!).padding,
      content: getComputedStyle(document.querySelector('.markdown-render__content')!).fontSize,
    };
  });
  const before = await measure();
  await page.locator('input[type="range"]').fill('18');
  const after = await measure();
  expect(after.content).toBe('18px');
  expect({ ...after, content: before.content }).toEqual(before);
});

test('12px 基准联动正文、子容器、图片和图表，宿主根字号不参与', async ({ page }) => {
  await page.route('https://example.com/size-probe.svg', route => route.fulfill({
    contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="blue"/></svg>',
  }));
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Markdown 源码' }).fill('# 标题\n\n> [!NOTE]\n> 正文\n\n`代码`\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n<demo-card user-id="1"></demo-card>\n\n```mermaid\ngraph LR\n A-->B\n```\n\n![测试](https://example.com/size-probe.svg)');
  await expect(page.locator('.md-mermaid svg')).toBeVisible();
  const image = page.locator('.markdown-render img');
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveJSProperty('naturalWidth', 120);
  const measure = () => page.locator('.markdown-render__content').evaluate(element => {
    const size = (selector: string, property: string) => parseFloat(getComputedStyle(element.querySelector(selector)!).getPropertyValue(property));
    return {
      base: parseFloat(getComputedStyle(element).fontSize), heading: size('h1', 'font-size'),
      tablePadding: size('td', 'padding-left'), alertPadding: size('.md-alert', 'padding-left'),
      codePadding: size('p code', 'padding-left'), icon: size('.md-alert svg', 'width'),
      cardPadding: size('.demo-card', 'padding-left'), image: size('img', 'width'),
      diagram: element.querySelector('.md-mermaid svg')!.getBoundingClientRect().width,
    };
  });
  const before = await measure();
  expect(before.base).toBe(12);
  expect(before.image).toBe(120);
  // 验证组件基础字号独立于项目的 html 字号。
  await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
  expect((await measure()).base).toBe(12);
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await page.locator('input[type="range"]').fill('18');
  const after = await measure();
  for (const key of Object.keys(before) as (keyof typeof before)[]) expect(after[key] / before[key], key).toBeCloseTo(1.5, 1);
});

test('空主题跟随宿主，显式主题只控制自身 dark 并联动注入组件 Tailwind', async ({ page }) => {
  await page.goto('/');
  const renderer = page.locator('.markdown-render');
  const card = page.locator('.demo-card');
  // 示例的强制亮色 !bg 会覆盖正常 dark 工具类；不改源码，仅移除此测试干扰项。
  await card.evaluate(element => element.classList.remove('!bg-gray-200'));
  await expect(renderer).not.toHaveAttribute('data-theme');
  await expect(renderer).not.toHaveClass(/\bdark\b/);
  const lightBackground = await card.evaluate(element => getComputedStyle(element).backgroundColor);
  await page.locator('select').selectOption('dark');
  await expect(renderer).toHaveClass(/\bdark\b/);
  await expect(card).toHaveCSS('background-color', 'rgb(17, 24, 39)');
  expect(await page.locator('html').evaluate(element => element.classList.contains('dark'))).toBe(false);
  await page.locator('select').selectOption('light');
  await expect(renderer).not.toHaveClass(/\bdark\b/);
  await expect(card).toHaveCSS('background-color', lightBackground);
  await page.locator('select').selectOption('');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(renderer).not.toHaveClass(/\bdark\b/);
  await expect(renderer).not.toHaveAttribute('data-theme');
  await expect(renderer).toHaveCSS('background-color', 'rgb(21, 24, 33)');
  await expect(card).toHaveCSS('background-color', 'rgb(17, 24, 39)');
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await expect(renderer).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});

test('Mermaid 内部文字随整图缩放，字号变大不裁切标签', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.md-mermaid svg')).toBeVisible();
  const measure = () => page.locator('.md-mermaid svg').evaluate(svg => {
    const label = svg.querySelector('foreignObject')!;
    const text = label.querySelector('.nodeLabel')!;
    return {
      font: getComputedStyle(text).fontSize,
      labelHeight: label.getBoundingClientRect().height,
      textHeight: text.getBoundingClientRect().height,
    };
  });
  const before = await measure();
  await page.locator('input[type="range"]').fill('48');
  const after = await measure();
  expect(after.font).toBe(before.font);
  expect(after.textHeight / after.labelHeight).toBeCloseTo(before.textHeight / before.labelHeight, 2);
  expect(after.textHeight).toBeLessThanOrEqual(after.labelHeight + 1);
});

test('Mermaid 支持缩放、拖拽和最佳适配复位', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('.md-mermaid-canvas');
  await expect(canvas.locator('svg')).toBeVisible();
  const transform = () => canvas.evaluate(element => getComputedStyle(element).transform);
  const original = await transform();
  await page.getByRole('button', { name: '放大图表' }).click();
  expect(await transform()).not.toBe(original);
  await page.getByRole('button', { name: '缩小图表' }).click();
  expect(await transform()).toBe(original);
  const viewport = page.locator('.md-mermaid-viewport');
  const box = (await viewport.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 30);
  await page.mouse.up();
  expect(await transform()).not.toBe(original);
  await page.getByRole('button', { name: '最佳适配', exact: true }).click();
  expect(await transform()).toBe(original);
  await viewport.focus();
  await page.keyboard.press('+');
  expect(await transform()).not.toBe(original);
  await page.keyboard.press('Home');
  expect(await transform()).toBe(original);
});

test('Mermaid 放大撑高视口，缩小保持初始高度和上下留白', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.md-mermaid svg')).toBeVisible();
  const measure = () => page.locator('.md-mermaid').evaluate(container => {
    const viewport = container.querySelector('.md-mermaid-viewport')!;
    const svg = container.querySelector('svg')!;
    const box = viewport.getBoundingClientRect();
    const diagram = svg.getBoundingClientRect();
    const css = getComputedStyle(viewport);
    return { width: container.getBoundingClientRect().width, height: box.height,
      diagramHeight: diagram.height, top: diagram.top - box.top, bottom: box.bottom - diagram.bottom,
      padding: parseFloat(css.paddingTop), font: parseFloat(css.fontSize) };
  });
  await expect.poll(async () => (await measure()).top).toBeGreaterThan(0);
  const before = await measure();
  expect(before.padding).toBeCloseTo(before.font * 2);
  await page.getByRole('button', { name: '放大图表' }).click();
  const enlarged = await measure();
  expect(enlarged.width).toBeCloseTo(before.width);
  expect(enlarged.height - before.height).toBeCloseTo(enlarged.diagramHeight - before.diagramHeight, 0);
  expect(enlarged.top).toBeGreaterThanOrEqual(enlarged.padding - 1);
  expect(enlarged.bottom).toBeGreaterThanOrEqual(enlarged.padding - 1);
  await page.getByRole('button', { name: '缩小图表' }).click();
  await page.getByRole('button', { name: '缩小图表' }).click();
  expect((await measure()).height).toBeCloseTo(before.height);
  await page.getByRole('button', { name: '最佳适配', exact: true }).click();
  expect((await measure()).height).toBeCloseTo(before.height);
});

test('Mermaid 在亮暗主题均不显示滤镜或投影', async ({ page }) => {
  await page.goto('/');
  for (const theme of ['light', 'dark']) {
    await page.locator('select').selectOption(theme);
    await expect(page.locator('.md-mermaid svg')).toBeVisible();
    const decorated = await page.locator('.md-mermaid').evaluate(container =>
      [container, ...container.querySelectorAll('*')].filter(element => {
        const css = getComputedStyle(element);
        return css.boxShadow !== 'none' || css.textShadow !== 'none' || css.filter !== 'none';
      }).map(element => element.tagName));
    expect(decorated).toEqual([]);
  }
});
