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

## Render 性能压测

运行 `npm run test:perf`，或使用 `PERF_CPU_RATE=4 npm run test:perf` 检查 CPU 降速下的表现。独立生产构建使用端口 1981，覆盖长文挂载、连续流式更新、代码/公式/Mermaid、多实例与卸载后内存；不随常规浏览器回归自动执行。测量口径、复现步骤和本轮结果见 [Render 性能压测](./render-performance)。

## 100% 的含义

`vitest.config.ts` 使用 V8 coverage，对 `components/**/*.{ts,vue}`、`use.lib/**/*.ts` 和 `index.ts` 中每个运行时文件要求语句、分支、函数、行四项均为 100%，不降低门槛。仅排除声明文件与三个纯类型文件；不排除媒体解析、错误回退或异步逻辑。`test:coverage:input` 只检查 Input，不能代替全库检查。

报告位于 `coverage/index.html`、`coverage/coverage-summary.json` 和 `coverage/coverage-final.json`。测试数量与当前验证结果见 [Render 验证记录](../markdown-render-validation)。测试全部通过不等于覆盖率达到 100%，必须检查 coverage 命令退出码和报告。

此指标不包含 CSS、演示应用、文档页面、构建脚本或第三方依赖，也不能替代浏览器行为测试。纯类型接口由 `test:types` 验证，文档可复制用例由 `docs:check` 验证。

## 浏览器回归

| 测试文件 | 重点 |
| --- | --- |
| `e2e/docs-input.browser.ts` | 直接运行文档案例：四种候选模式、事件/快捷键/发送、真实 HTTP 防抖与重试 |
| `e2e/input.browser.ts` | 编辑、mention、输入法事件、发送、浮窗、移动布局和文案 |
| `e2e/renderer.browser.ts` | Markdown、媒体、主题、字号、Mermaid、拖拽及错误回退 |
| `e2e/theme.browser.ts` | 不透明色阶、实例隔离、统一字号上限、宽图文字缩放 |
| `e2e/mermaid-lifecycle.browser.ts` | 绘制期间临时 SVG 隔离、页面尺寸/滚动、旧图保留和清理 |
| `e2e/media.browser.ts` | 标准/高级图片、真实音视频 metadata、百分比等比布局、视频换源 |
| `e2e/speech-input.browser.ts` | 插槽控件、按键/指针、取消、热词增强、音量波纹和流释放；识别/麦克风服务为模拟 |
| `e2e/tts.browser.ts` | 增量/累计输入、本地声音过滤、暂停/继续/停止与错误；合成服务为模拟 |
| `e2e/image-preview.browser.ts` | 真实弹层布局、主题、焦点/滚动恢复、滚轮/拖拽、触屏手势、百分比显示、右键/长按抑制、清理与 Mermaid 保持 |

媒体专项使用本地生成的 SVG、WebM 与 WAV，不依赖外网。演示工作台中的 MDN 音视频示例仍需联网。绘制期间的 DOM 可见性和真实尺寸由浏览器验证，不能用 happy-dom/mock 覆盖率证明。主题断言依据实例配置色；默认色和自定义色分别有专项覆盖。

## 文档检查与当前边界

`docs:links` 对 VitePress 生成的 HTML 检查站内目标文件和锚点，包括语言切换、指南、API 和原始提示词下载；它不检查外网可达性。子路径部署先用相同 `DOCS_BASE` 构建并检查。

当前浏览器验证环境为本机 Chrome/Chromium。尚未建立 Firefox/WebKit、真实系统输入法、移动软键盘与 SSR/Nuxt 的完整兼容矩阵。100% 运行时代码覆盖率不代表这些环境已经验证，也不代表第三方 Mermaid/KaTeX 所有输入均被覆盖。

## 语音与图片预览的人工验收

语音浏览器测试替换了识别、麦克风/音量采样与合成服务，验证宿主状态和交互，不证明真实识别准确率、实际出声、语言包安装、原生权限弹窗或离线可用。合成的多指事件也不能证明所有移动系统手势已经兼容。请在目标设备检查：

| 范围 | 验收项 |
| --- | --- |
| 识别环境 | HTTPS/localhost、麦克风允许/拒绝、设备缺失、真实 zh-CN/en-US、语言包可安装/不可用、离线本地模式与嵌入策略 |
| 取消边界 | 权限返回前松手、Esc、切标签/窗口失焦、禁用/卸载；无迟到文字插入、麦克风指示正常释放 |
| 音量与波纹 | 静音/普通说话/大音量、独立采样被拒绝但仍可转写、减少动态效果与采样释放 |
| TTS | 系统本地声音安装与列表更新、精确语言/指定声音、用户操作开播、真实暂停继续、离线出声、停止/替换网络回复 |
| 图片预览 | 标准图/指令图/链接图、窄屏、真实双指/拖拽、百分比显示、长按/右键抑制、Esc、滚动/焦点恢复、来源移除 |
| 手机预览 | 没有百分比输入框，不主动唤起键盘；长按不出现组件菜单或自动下载，原生菜单在目标浏览器实测 |

每个承诺支持的浏览器/系统组合都应记录版本与结果。模拟语音测试通过，不代表所有浏览器均提供本地 ASR 或本地 TTS 声音。只修改文档时，运行 build（声明）、docs:check、docs:build 与 docs:links；历史测试数量是注明日期的快照，不能代替当前套件复跑。
