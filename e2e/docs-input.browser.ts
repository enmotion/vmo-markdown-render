import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/e2e/fixtures/input-docs.html'); });

test('文档本地全集与自定义本地过滤示例可直接运行', async ({ page }) => {
  const local = page.locator('[data-case="local"]');
  await local.locator('[contenteditable="true"]').pressSequentially(' @');
  const query = local.getByRole('textbox', { name: '搜索引用', exact: true });
  await expect(local.getByRole('option')).toHaveCount(2);
  await query.fill('user-lin');
  await expect(local.getByRole('option')).toHaveText('林见微');
  await query.fill('ljw');
  await expect(local.getByRole('option')).toHaveCount(0);
  await query.press('Escape');
  const sync = page.locator('[data-case="sync"]');
  await sync.getByRole('checkbox').check();
  await sync.getByRole('button', { name: '选择成员', exact: true }).click();
  await sync.getByRole('textbox', { name: '搜索引用', exact: true }).fill('ljw');
  await expect(sync.getByRole('option')).toHaveCount(1);
  await sync.getByRole('option').click();
  await expect(sync.locator('pre')).toContainText('user-lin');
});

test('文档远端全集本地过滤与远端搜索不二次过滤示例', async ({ page }) => {
  const local = page.locator('[data-case="async"]');
  await local.getByRole('button', { name: '异步获取成员', exact: true }).click();
  await expect(local.getByRole('option')).toHaveCount(2);
  const query = local.getByRole('textbox', { name: '搜索引用', exact: true });
  await query.fill('林'); await expect(local.getByRole('option')).toHaveCount(1);
  await query.fill('ljw'); await expect(local.getByRole('option')).toHaveCount(0);
  await query.press('Escape');
  const remote = page.locator('[data-case="remote"]');
  await remote.getByRole('button', { name: '远端搜索成员', exact: true }).click();
  const search = remote.getByRole('textbox', { name: '搜索引用', exact: true });
  await search.fill('ljw'); await search.fill('swt');
  await expect(remote.getByRole('option')).toHaveCount(1);
  await expect(remote.getByRole('option')).toContainText('苏晚棠');
  await search.press('Enter');
  await expect(remote.locator('pre')).toContainText('user-su');
});

test('文档事件日志、引用快捷键和发送热键分离，输出保留 mention 参数', async ({ page }) => {
  const example = page.locator('[data-case="events"]');
  const editor = example.locator('[contenteditable="true"]');
  await editor.focus(); await editor.press('Control+u');
  const query = example.getByRole('textbox', { name: '搜索引用', exact: true });
  await expect(query).toBeVisible(); await query.fill('林'); await query.press('Enter');
  await expect(example.getByTestId('example-model')).toContainText('user-lin');
  await expect(example.getByTestId('example-events')).toContainText('select');
  await expect(example.getByTestId('example-events')).not.toContainText('"name": "enter"');
  await editor.press('End'); await editor.pressSequentially('总结');
  await editor.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect(example.getByTestId('example-sent')).toContainText('user-lin');
  await expect(example.getByTestId('example-sent')).toContainText('总结');
  await expect(example.getByTestId('example-events')).toContainText('"defaultPrevented": true');
  await expect(example.getByTestId('example-events')).toContainText('host-send');
  await expect(example.getByTestId('example-model')).toHaveText('[]');
  // 仅按钮模式下 Ctrl/Cmd+Enter 仍是换行，不再追加发送记录。
  await example.getByLabel('发送热键', { exact: true }).selectOption('button');
  await editor.fill('只换行'); await editor.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect(example.getByTestId('example-sent')).not.toContainText('只换行');
  await example.getByLabel('发送热键', { exact: true }).selectOption('enter');
  await editor.fill('- 列表项'); await editor.press('Enter');
  await expect(example.getByTestId('example-sent')).not.toContainText('列表项');
  await editor.fill('回车发送'); await editor.press('Enter');
  await expect(example.getByTestId('example-sent')).toContainText('回车发送');
  await example.getByRole('button', { name: '打开成员引用', exact: true }).click();
  await example.getByRole('listbox').getByRole('option').click();
  await example.getByRole('button', { name: '删除 林见微', exact: true }).click();
  await expect(example.getByTestId('example-events')).toContainText('mention-remove');

});

test('文档真实 HTTP 示例防抖、字段适配、错误展示与重试', async ({ page }) => {
  const requests: string[] = [];
  let failed = true;
  await page.route('**/api/mention-options?*', async route => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('source')).toBe('member');
    const query = url.searchParams.get('query')!; requests.push(query);
    if (query === 'fail' && failed) return route.fulfill({ status: 500, body: 'error' });
    return route.fulfill({ json: [{ id: 'server-user', label: '服务端中文结果', initials: query }] });
  });
  const example = page.locator('[data-case="http"]');
  await example.getByRole('button', { name: '搜索成员', exact: true }).click();
  const query = example.getByRole('textbox', { name: '搜索引用', exact: true });
  await query.fill('l'); await query.fill('ljw');
  await expect(example.getByRole('option')).toContainText('服务端中文结果');
  expect(requests).toContain('ljw');
  expect(requests).not.toContain('l');
  await query.fill('fail'); await expect(example.locator('p[role="status"]')).toContainText('请求失败');
  failed = false;
  await example.getByRole('button', { name: '重试当前查询', exact: true }).click();
  await expect(example.getByRole('option')).toContainText('服务端中文结果');
  await example.getByRole('option').click();
  await expect(example.locator('[data-mention]')).toContainText('服务端中文结果');
  expect(requests.slice(-3)).toEqual(['ljw', 'fail', 'fail']);
});
