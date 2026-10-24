# Markdown 样式变量

消费者加载 `style.css`，公式另加载 `math.css`。所有变量可在组件 class 或宿主祖先上配置。

| 变量 | 用途 / 默认 |
| --- | --- |
| --md-primary | 主色；亮色 #4f46e5，暗色 #a5a0ff |
| --md-warning / info / success / danger | 可选语义色，缺省回退主色 |
| --md-light-background / --md-dark-background | 亮／暗基础色，默认 #ffffff / #151821；主题切换交换背景和正文色 |
| --md-h1-font-size ～ --md-h6-font-size | 各级标题字号，默认 2 / 1.65 / 1.35 / 1.15 / 1 / .9em |
| --md-font-max-size | 组件内容字号上限，默认不限制；Render 与 Input 共用 |
| --md-heading-color | 全部标题色，缺省主色 |
| --md-h1-color ～ --md-h6-color | 对应标题色，缺省统一标题色 |
| --md-text-color | 正文色，按主题默认 |
| --md-muted-color | 引用等次级文字，按主题默认 |
| --md-background | 容器背景，按主题默认 |
| --md-border-color | 边框，按主题默认 |
| --md-link-color | 链接色，缺省主色 |
| --md-code-background | 代码背景，按主题默认 |
| --md-table-header-background | 表头背景，按主题默认 |
| --md-font | 正文字体，默认系统 sans-serif |
| --md-mono-font | 代码字体，默认系统 monospace |
| --md-block-spacing | 段落及块间距，默认 1em |
| --md-line-height | 正文行高，默认 1.75 |
| --md-default-surface | 普通子容器背景，默认正文色 7% 与底色 93% 的不透明混合；代码、目录、表头、图表及音视频共用 |
| --md-video-background | 视频背景，默认通用表面色 |
| --md-audio-background | 音频背景，默认正文色 7% 与底色 93% 的不透明混合 |
| --md-radius | 面板圆角，默认 .5em |
| --md-alert-background | 提示块背景，默认语义色 4% 混合 |
| --md-alert-border | 提示块边框色，默认语义色 |
| --md-code-keyword / string / number / comment | 代码高亮颜色 |
| --md-font-base-size | fontBaseSize 属性写入的 px 基础字号，默认 12px |
| --md-size | 受 --md-font-max-size 限制后的基础字号；业务组件可消费或由外部 CSS 覆盖 |

局部覆盖使用稳定类，例如 `.my-markdown .md-alert-warning`。代码块、目录、提示块、图表、表格容器分别为 `.md-code-block`、`.md-toc`、`.md-alert`、`.md-mermaid`、`.md-table-scroll`。

正文段落间距默认 1em，标题字号使用 em。需要细调时可使用实例 class 覆盖这些语义元素。unstyled 模式不应用 `.md-styled` 下的排版规则，外部可自行定义；第三方公式的 math.css 由消费者选择是否加载。

字号只设置在 `.markdown-render__content` 内容层；`.markdown-render` 外壳保持宿主字号。容器宽高、padding 和 margin 由宿主布局控制；内容增大后自然换行。希望外层高度固定时，由宿主设置固定高度并启用 overflow:auto。

主题默认空值，组件不添加 .dark 或 data-theme，跟随宿主祖先 .dark；dark/auto 的暗色结果在当前容器添加 .dark。宿主 Tailwind 需采用 class 模式；不操作 html。外部祖先 .dark 不能通过移除实例 class 屏蔽。

普通子容器默认使用正文色与底色的不透明混合；表面、边框、次要文字分别采用正文色占比 7%、20%、65% 的色阶。语义提示块继续使用 primary、danger、warning、success、info 各自的配色，不受通用背景调整影响。已有专用背景变量仍可覆盖默认值。注入业务组件可消费 `--md-default-surface` 接入同样效果。


## Input 专用变量

先加载 `vmo-markdown-render/style.css`。Input 与 Render 共用上表的主题、正文、字号和语义色变量；输入框补充以下变量：

| 变量 | 默认 | 用途 |
| --- | --- | --- |
| --md-input-padding | 1em | 输入区内边距 |
| --md-input-radius | .75em | 容器圆角 |
| --md-input-max-height | 20em | 正文输入区最大高度，超出滚动 |
| --md-mention-color | 当前 primary | mention 标签文字 |
| --md-mention-background | 当前默认表面色 | mention 标签背景 |
| --md-mention-menu-background | 当前默认背景 | 候选浮窗背景 |

```vue
<MarkdownInput style="--md-background: transparent; --md-input-padding: .75em; --md-input-max-height: 12em" />
```

浮窗方向、间距与移动模式使用 placement / offset / mobilePlacement 配置，不建议通过改写内部定位变量实现。完整用例见 [Input 配置](./guide/input-configuration)。
