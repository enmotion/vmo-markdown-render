# MarkdownRender 验证记录

更新：2026-10-24。环境：macOS、Node 24.14.1、Vue 3、本机 Chrome/Chromium。以下是当前实现的验证范围；复现命令和覆盖率口径见 [测试与兼容性](./guide/testing)。

## 当前验证结果

- 全库 33 个测试文件、108 项单元/组件/性能测试通过。
- `npm run test:coverage`：逐文件语句、分支、函数、行四项均 100%，沿用原有门槛与范围，没有添加覆盖率豁免。
- 完整浏览器回归 43 项全部通过，覆盖 Input、Render、媒体、主题及 Mermaid。
- `typecheck`、`test:types`、`build`、`docs:check`、`docs:build` 与 `docs:links` 为独立检查，不能由单元覆盖率代替。
- coverage/ 与 test-results/ 为本地报告/截图，不作为库运行时或 npm 包内容。

## 解析与边界

使用 markdown-it 14.3.3、footnote、task-lists，@markmend/core 处理流式补全；内部 MarkdownNode 独立于第三方 token。KaTeX、Mermaid 和 highlight.js 按需导入。构建保留 ESM/CommonJS、声明、基础 CSS 与独立 math.css/字体。

原始 HTML 转义，业务组件仅通过已有注册标签协议挂载；没有通用 Vue 模板执行。流式组件/媒体声明不由补全器制造，最终以原文解析。文本规则与代码、数学公式和媒体属性隔离。

性能测试使用 36,000 字符、600 个标题及 100 次追加；输出当前设备的解析耗时，宽松检查用于发现卡死或显著退化。解析仍为全文解析，不据此宣称真正增量解析或所有设备的生产性能。

## 基础色、字号及布局

`theme-colors.test.ts` 验证亮暗基础色不透明限制及语义色兼容；`theme.browser.ts` 验证两组件 light/dark/auto/宿主 .dark、显式 light、实例隔离、候选菜单底色、不透明色阶顺序和 alpha=255。

`--md-font-max-size` 同时约束基础文字与各级标题；原 `--md-heading-max-size` 已移除。正文、代码、表格、Input、公式基础文字和 Mermaid 均有浏览器验证。公式内部数学比例与业务组件自定义字号有单独边界，见 [主题指南](./guide/theme)。标题仍可用六个 `--md-hN-font-size` 分别配置。

基础字号只改变内容，不修改宿主 html/body 或 Render 外壳字号。图片/视频不随字号缩放；图片全宽或指定百分比，视频按原始比例。Mermaid 以 12px 适配宽度为基准放大，不再被 max-width 抵消；超出图表视口可拖拽。宽图测试验证字号翻倍与统一上限。亮暗截图输出到 test-results/theme-light.png / theme-dark.png。

## Mermaid 生命周期与非法 SVG

原始包含 `<br/>` 的中文节点/连线输入在真实 Mermaid 下回归。采用 htmlLabels:false 绕开 strict 模式输出不合法 XHTML 换行的路径；检查 XML parsererror、SVG 根名和命名空间，使用 XMLSerializer。非法 SVG/语法错误保留源码并报告 mermaid 错误，队列仍可继续。

修复前通过 MutationObserver 捕获三图绘制中的临时 SVG，27 次采样均未隔离。`mermaid-lifecycle.browser.ts` 验证绘制期间 fixed 屏幕外容器、隐藏但有非零测量尺寸、aria-hidden/inert、无指针交互；主题切换时保留三张旧图，页面 scrollWidth/scrollHeight/scrollY 不变。快速切换后最终颜色符合最新主题，渲染失败和绘制中卸载后无残留。

单元测试通过受控 Promise 验证旧图保留、成功替换、失败源码回退/事件、过期结果和卸载清理；真实浏览器另行验证多行文字、节点/连线、尺寸、缩放与拖拽。

## 媒体协议 v1

标准 Markdown 图片、高级 `::image` 和旧 audio/video 围栏统一为 media 节点，自定义组件不变。协议是 Generic Directives 单行 leaf 子集，媒体语义由本库定义，不宣称是 CommonMark 官方媒体标准。

`media-protocol.test.ts` / `media.test.ts` 覆盖嵌套说明、转义、引号与错误属性、静默段落终止、未知属性及原文、百分比范围、危险 src/poster、MIME、流式缺失原行、代码不挂载、旧围栏和零尺寸 metadata。默认全宽；图片/视频 width 仅允许 (0%, 100%]，高度等比。

`media.browser.ts` 使用本地 SVG、实际生成的 WebM/WAV，不依赖外网：检查标准图片与高级图片加载、600/360px 宽度及等比高度、非法宽度回退、原始 320×180 视频比例、封面比例不同、默认/80% 宽度、控件、旧围栏及视频换源。演示工作台与中英文文档都有标准/高级图片并排协议示例和实际展示。

## 文档与兼容边界

中英文 API、主题、CSS 变量、媒体指南和四份模型提示词同步维护。`docs:check` 检查独立 Vue/TS 示例，`docs:build` 检查页面构建，`docs:links` 检查生成 HTML 的本地目标和锚点。维护记录的英文摘要保留到中文详情的链接。

当前没有完整 Firefox/WebKit、原生系统输入法、真实移动软键盘、SSR/Nuxt 兼容矩阵；不提供 Markdown 导出器或自动迁移工具。未知媒体属性/原始指令只在内部解析节点保留。包审计/发布不属于覆盖率检查，不将历史审计结果表述为当前依赖安全承诺。

模型提示词中的组件格式通过 `prompt-components.test.ts` 回归：读取四份实际提示词，提取成对与自闭合 user-card 示例，用真实 Render 验证注册时传入字符串属性/纯文本插槽、未注册时保持原文。
