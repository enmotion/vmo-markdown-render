# vmo-markdown-render

Vue 3 Markdown 渲染组件，支持文档、流式内容、业务组件、主题及多正则文本转换。`markdown-input` 属于后续规划，本版本仅提供 `markdown-render`。

## 组件文档

基于 VitePress 的完整文档包含安装、全部 Props / Emits、实例 API、组件注入、正则规则与主题配置。

```bash
npm run docs:dev
npm run docs:build
npm run docs:preview
```

从 [安装与使用](docs/guide/getting-started.md) 开始，重点参考 [组件注入](docs/guide/components.md)、[正则规则](docs/guide/text-rules.md) 和 [完整 API](docs/api/markdown-render.md)。当前未通过 `defineExpose` 暴露自定义实例属性或方法。

## 使用

```vue
<script setup lang="ts">
import { MarkdownRender, type TextRule } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
// 使用公式时加载；字体作为独立资源由构建工具处理。
import 'vmo-markdown-render/math.css';
import UserCard from './UserCard.vue';

const content = '# 标题\n\n<user-card user-id="42"></user-card>';
const components = { 'user-card': UserCard };
const textRules: TextRule[] = [
  { pattern: /ORDER-(\d+)/g, replace: '订单 $1' },
  { pattern: /user:(\w+)/g, replace: ({ captures }) => captures[0] ?? '' },
];
</script>

<template>
  <markdown-render
    :content="content"
    :components="components"
    :text-rules="textRules"
    theme="auto"
    :font-base-size="12"
  />
</template>
```

Vue 为 peer dependency。保留原有 `VmoButton` 导出。构建输出 ES Module 和 CommonJS；不再输出 UMD。

## 属性与事件

| 属性 | 默认值 | 行为 |
| --- | --- | --- |
| content | `''` | 当前完整 Markdown，不是单次网络分片 |
| streaming | false | 流式语法补全；生成结束设为 false |
| theme | `''` | 空值跟随宿主；light / dark / auto，auto 跟随系统 |
| fontBaseSize | 12 | 基础字号，单位 px；如 18 表示 18px，无效值回退到 12 |
| components | 空映射 | 实例级 Vue 组件注册 |
| textRules | 空数组 | 多正则转换规则 |
| unstyled | false | 禁用默认排版与主题 |

事件：`error`（阶段与错误信息）、`headings-change`（标题及锚点数组）、`link-click`（href、原始 MouseEvent）。可在 link-click 中 preventDefault 接管导航。

## 语法

支持标题、列表、引用、表格、任务列表、删除线、链接、图片、代码高亮、脚注。`[TOC]` 独占一行生成目录；标题与脚注 ID 按组件实例隔离。代码围栏标记 `mermaid` 渲染图表；`$…$` 为行内公式，`$$…$$` 为块级公式。高亮、KaTeX 和 Mermaid 运行时在用到时异步加载，失败保留源码。

原生 HTML 默认按文本展示，本版不提供开启开关；不编译 Vue 模板。任务列表仅展示。未支持的 Markdown 方言保持可读，不承诺所有第三方语法。

### 提示块

```markdown
> [!WARNING]
> 注意这里的风险。
```

| 标记 | 色彩变量 |
| --- | --- |
| IMPORTANT | primary |
| NOTE / INFO | info |
| TIP / SUCCESS | success |
| WARNING | warning |
| CAUTION / DANGER / ERROR | danger |

INFO、SUCCESS、DANGER、ERROR 是本库别名。TIP 表示技巧，不代表操作已成功。

## 样式与缩放

```css
.my-content {
  --md-primary: #6366f1;
  /* 下面四色可省略，分别回退到 primary */
  --md-warning: #b77916;
  --md-info: #0284c7;
  --md-success: #16804a;
  --md-danger: #dc2626;
  --md-heading-color: #253047;
  --md-h1-color: #4338ca;
}
```

H1～H6 的回退为该级标题色 → heading-color → primary。正文、粗体和斜体使用正文色；链接使用 primary。亮暗主题同页独立，可在 `[data-theme='dark']` 上单独覆盖变量。

完整变量见 [主题变量清单](docs/markdown-styles.md)。基础字号默认 12px，fontBaseSize 指定实例基础字号，标题与 em 间距随之调整；只对内部 `.markdown-render__content` 设置字号，不修改页面根字号和外壳字号，外部容器布局由宿主控制。业务组件应使用 em 或 `--md-size` 接入缩放，固定 px 不会自动改写。内置图片按自然尺寸 / 12 换算为 em，Mermaid 按 viewBox / 12 换算为 em，随字号改变整体尺寸，并受容器最大宽度限制。

## 外部 Vue 组件

标签使用小写 kebab-case，只接受已注册组件。支持成对闭合标签和自闭合标签；字符串属性传给组件（如 user-id 对应 userId）。不执行 `:prop`、`@event`、v-bind 或任意 JavaScript。标签正文以纯文本默认插槽提供，不解析嵌套业务标签或富文本插槽。

组件可以使用 provide/inject 和自己的请求工具，加载、失败、重试、取消请求由组件负责。完整标签到达后才挂载，正文追加保持已有组件实例；不要在渲染函数中发请求。流式阶段未完整标签作为文本展示。未知标签保留原文。

## 多正则转换规则数组

规则均匹配当前原始正文文本。按位置从左到右处理，同起点采用数组首条；命中区间被消费，与它重叠的候选忽略。不同位置可命中不同规则，替换结果不再次匹配，也不作为 Markdown/HTML 解析。

字符串替换支持 `$$`、`$&`、`$1`～`$99`、`$<name>`。回调参数包含 match、captures、offset、input 和 groups。不修改调用方正则的 lastIndex；g/y 标记不控制跨规则的全局匹配行为。零长度匹配被跳过并报告，回调失败保留原文。单节点超过 100,000 字符、规则超过 100 条或候选匹配超过 10,000 个时保留原文并报告，防止候选内存无限增长；宿主仍须避免可能灾难性回溯的正则。

只处理正文文本节点，跳过代码、公式、URL、组件属性；不跨节点匹配。包含 Markdown 特殊字符的结构化数据可能被拆成多个节点，应使用明确、可匹配的格式。流式无法自动推断任意正则的完整性，规则应包含结束条件。

## 开发与验证

```bash
npm install
npm run dev
npm run typecheck
npm run test:run
npm run build
npm run test:browser
```

示例工作台默认运行于 http://127.0.0.1:1980，提供源码、主题、缩放和流式模拟。浏览器测试需要本地 Chromium；配置支持 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定路径。

架构与选型见 [维护说明](docs/markdown-render-architecture.md)，需求见 [PRD](docs/markdown-render-prd.md)。

### Tailwind 暗色模式

宿主 Tailwind 使用 class 暗色策略（本项目已配置 `darkMode: 'class'`）。theme="dark" 只在当前渲染器容器添加 `.dark`，不修改 html；内部注册组件的 `dark:` 工具类可随之生效。theme="light" 移除实例 `.dark`；theme="auto" 根据系统控制实例 `.dark`。默认空值不添加主题 class 或 data-theme，内置主题与图表跟随宿主祖先 `.dark`。

标准 Tailwind class 策略下，祖先已有 `.dark` 时，显式 light 不能屏蔽注入组件的 `dark:` 规则；内置 Markdown 配色仍使用显式亮色。业务组件内部样式隔离为另一事项，本次不改写现有排版选择器。

提示块标题默认使用英文类型名。通过 `alertLabels` 提供实例级翻译，也可在标记后直接指定标题（优先级更高，按纯文本显示）：

```vue
<MarkdownRender :content="content" :alert-labels="{ IMPORTANT: '重点', NOTE: '备注', TIP: '建议', WARNING: '警告', CAUTION: '注意事项' }" />
```

```markdown
> [!IMPORTANT] 发布前检查
> 请先确认配置。
```

正则规则还支持组件输出，捕获组通过 `props` 回调传入；也可让 `replace` 回调返回 `h(...)`。两种规则与纯文本规则共用匹配优先级，输出不会再次匹配，代码、公式与 URL 不参与转换。

```ts
const textRules: TextRule[] = [
  {
    pattern: /ORDER-(\d+)/g,
    component: OrderLink,
    props: ({ captures }) => ({ orderId: captures[0] }),
  },
  {
    pattern: /USER-(\w+)/g,
    replace: ({ captures }) => h(UserBadge, { name: captures[0] }),
  },
];
```

正文中的组件建议使用 `span`、`button` 等行内元素作为根节点，避免在段落中嵌入块级布局。

通过 `themeColors` 配置实例语义色（仅支持这五个键）：

```vue
<MarkdownRender
  :content="content"
  :theme-colors="{
    primary: '#4f46e5',
    warning: '#b77916',
    info: 'rgb(37, 99, 235)',
    danger: 'rgba(220, 38, 38, 0.9)',
    success: '#16803cff',
  }"
/>
```

导出 `ThemeColors` 和 `ThemeColor` 类型。TypeScript 限制属性名与颜色格式；运行时进一步检查十六进制字符与长度（6 或 8 位）、RGB 通道（0～255）及透明度（0～1）。非法值忽略；不接受颜色名称、CSS 变量和 3 位简写。不配置的语义色仍沿用原有回退逻辑。`theme` 继续控制亮暗模式，`themeColors` 的显式配色在切换模式时保持不变。

测试命令：`npm run test:coverage` 生成 `coverage/index.html`，对库入口 `index.ts`、全部 `components/` 和 `use.lib/` 运行时代码实施逐文件 100% 语句、分支、函数、行覆盖率门槛。纯类型文件不计入运行时覆盖率；示例应用、CSS、构建脚本和第三方依赖不计入此指标。增强库的异常、竞态由单元测试隔离模拟，真实渲染与交互由 `npm run test:browser` 验证。`npm run build` 同时检查源代码类型并生成发布产物。
