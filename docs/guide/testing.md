# 测试、覆盖率与兼容性

## 复现命令

```bash
npm ci
npm run test:coverage
npm run typecheck
npm run test:types
npm run build
npm run docs:check
npm run docs:build
npm run docs:links
npm run test:browser
```

浏览器运行时未安装时，先执行 `npx playwright install chromium`，或设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 为本机 Chromium/Chrome 的可执行路径。Playwright 会自动启动本地 Vite 服务；默认端口 1980。

## 100% 的含义

`vitest.config.ts` 使用 V8 coverage，对 `components/**/*.{ts,vue}`、`use.lib/**/*.ts` 和 `index.ts` 中每个运行时文件要求语句、分支、函数、行四项均为 100%，不降低门槛。仅排除声明文件与三个纯类型文件；不排除媒体解析、错误回退或异步逻辑。`test:coverage:input` 只检查 Input，不能代替全库检查。

报告位于 `coverage/index.html`、`coverage/coverage-summary.json` 和 `coverage/coverage-final.json`。测试数量与当前验证结果见 [Render 验证记录](../markdown-render-validation)。测试全部通过不等于覆盖率达到 100%，必须检查 coverage 命令退出码和报告。

此指标不包含 CSS、演示应用、文档页面、构建脚本或第三方依赖，也不能替代浏览器行为测试。纯类型接口由 `test:types` 验证，文档可复制用例由 `docs:check` 验证。

## 浏览器回归

| 测试文件 | 重点 |
| --- | --- |
| `e2e/input.browser.ts` | 编辑、mention、输入法事件、发送、浮窗、移动布局和文案 |
| `e2e/renderer.browser.ts` | Markdown、媒体、主题、字号、Mermaid、拖拽及错误回退 |
| `e2e/theme.browser.ts` | 不透明色阶、实例隔离、统一字号上限、宽图文字缩放 |
| `e2e/mermaid-lifecycle.browser.ts` | 绘制期间临时 SVG 隔离、页面尺寸/滚动、旧图保留和清理 |
| `e2e/media.browser.ts` | 标准/高级图片、真实音视频 metadata、百分比等比布局、视频换源 |

媒体专项使用本地生成的 SVG、WebM 与 WAV，不依赖外网。演示工作台中的 MDN 音视频示例仍需联网。绘制期间的 DOM 可见性和真实尺寸由浏览器验证，不能用 happy-dom/mock 覆盖率证明。主题断言依据实例配置色；默认色和自定义色分别有专项覆盖。

## 文档检查与当前边界

`docs:links` 对 VitePress 生成的 HTML 检查站内目标文件和锚点，包括语言切换、指南、API 和原始提示词下载；它不检查外网可达性。子路径部署先用相同 `DOCS_BASE` 构建并检查。

当前浏览器验证环境为本机 Chrome/Chromium。尚未建立 Firefox/WebKit、真实系统输入法、移动软键盘与 SSR/Nuxt 的完整兼容矩阵。100% 运行时代码覆盖率不代表这些环境已经验证，也不代表第三方 Mermaid/KaTeX 所有输入均被覆盖。
