# 主题与样式

## 亮暗模式

| theme | 行为 |
| --- | --- |
| `''` | 默认；不添加主题 class 或 data-theme，跟随宿主祖先 `.dark` |
| `light` | 内置 Markdown 使用亮色 |
| `dark` | 内置 Markdown 使用暗色，当前根容器添加 `.dark` |
| `auto` | 跟随系统偏好，暗色时当前根容器添加 `.dark` |

不修改 html/body。同页不同实例可以指定不同主题。宿主 Tailwind 使用 class 暗色策略时，注入组件可以使用 `dark:`；但祖先已有 `.dark` 时，显式 light 无法屏蔽业务组件的 Tailwind 暗色选择器。

## 实例语义色

```vue
<MarkdownRender
  :content="content"
  theme="auto"
  :theme-colors="{
    primary: '#4f46e5',
    warning: '#b77916',
    info: 'rgb(37, 99, 235)',
    danger: 'rgba(220, 38, 38, 0.9)',
    success: '#16803cff',
  }"
  :font-base-size="16"
/>
```

支持 6/8 位十六进制色与逗号分隔的 rgb/rgba；RGB 通道范围 0～255，透明度 0～1。非法值忽略；不接受颜色名、3 位十六进制、CSS 变量或 hsl。显式语义色在切换亮暗模式时保持不变；未配置的 warning/info/success/danger 回退到 primary。

## CSS 覆盖与字号

```vue
<MarkdownRender class="article" :content="content" :font-base-size="16" />
```

```css
.article {
  --md-heading-color: #253047;
  --md-h1-color: #4338ca;
  --md-line-height: 1.8;
}
```

标题颜色依次回退为该级标题色、统一标题色、primary。更多变量见 [CSS 变量清单](../markdown-styles)。`themeColors` 设置的颜色是实例根元素的内联变量，覆盖相同变量时优先考虑修改该 prop。

基础字号只作用于 `.markdown-render__content`，不修改页面根字号与外壳字号。标题和 em 间距随字号缩放；业务组件应使用 em 或 `--md-size`，固定 px 不会自动缩放。图片默认铺满内容区宽度，高度按比例自适应，不随字号缩放；Mermaid 以 12px 时的容器适配宽度为基准，按 fontBaseSize 成比例缩放；放大后可超出图表视口，通过拖拽查看，避免 max-width 将文字重新压小。统一字号上限仍限制图表文字缩放。外层宽高、padding、margin、滚动由宿主布局控制。

## unstyled

```vue
<MarkdownRender class="custom-markdown" :content="content" unstyled />
```

`unstyled` 去掉根元素的 `md-styled` 类，保留语义 DOM、组件、事件、主题状态和规则处理。它不会卸载已导入的 CSS，也不会移除独立导入的 KaTeX 样式。可以通过宿主 class 编写自己的排版；在 Vue scoped 样式中使用 `:deep()` 选择内部节点。

## 亮暗基础色与不透明色阶

两个组件都可通过 `themeColors.lightBackground`（默认 `#ffffff`）和 `darkBackground`（默认 `#151821`）独立配置基础色。亮色模式以亮色为背景、暗色为正文色；暗色模式交换两者。基础色只接受不透明颜色：六位 hex、以 FF 结尾的八位 hex、rgb 或 alpha 为 1 的 rgba。非法或透明基础色忽略；既有语义色仍支持透明度。调用方应选择有足够对比度的一亮一暗颜色，组件不会自动纠正颜色。

```vue
<MarkdownRender :content="content"
  :theme-colors="{ lightBackground: '#eeeeee', darkBackground: '#222222' }"
  style="--md-h1-font-size: 1.6em; --md-h2-font-size: 1.4em; --md-font-max-size: 24px" />
<MarkdownInput :theme-colors="{ lightBackground: '#f5f5f5', darkBackground: '#202020' }" />
```

表面、边框和次要文字分别取前景色 7%、20%、65% 与底色混合，结果不透明；提示块采用语义色 4% 与底色混合。按钮与图标继承所属文字色，输入候选菜单跟随底色。`--md-background`、`--md-text-color`、`--md-muted-color`、`--md-border-color` 和专用背景变量仍可覆盖。透明按钮表示露出所属表面，并不再用于生成灰阶。自定义 CSS 仍可主动设置透明背景。

代码高亮、链接、提示语义色和 Mermaid 继续使用各自亮暗配色；业务插槽组件需自行消费主题变量。默认正文颜色现在严格使用基础色互换，旧的固定次要文字与边框色改为派生色阶。

## 内容字号上限与标题字号

渲染组件支持 `--md-h1-font-size` 至 `--md-h6-font-size`，默认依次为 `2em`、`1.65em`、`1.35em`、`1.15em`、`1em`、`.9em`。`--md-font-max-size` 限制 Render 与 Input 内容的最大基础字号，并单独限制各级标题，默认不限制，实际字号取该级设置与上限的较小值。支持合法 CSS 长度，包括 px、rem、em 和 clamp()；em 跟随 fontBaseSize。建议使用正数，上限设置为 px 可在基础字号增大时保持固定限制。先将基础字号限制为 fontBaseSize 与上限的较小值，再计算各级文字比例；代码、表格、候选菜单随基础字号缩放，标题另行受同一上限约束；unstyled 模式由宿主自行排版。

字号上限请使用正数 px/rem，以便在各级文字中保持统一物理上限；不建议用 em 作为统一上限。旧变量 `--md-heading-max-size` 已移除，请迁移至 `--md-font-max-size`。公式的基础字号同样受限，内部数学排版比例保留；Mermaid 限制整图缩放后的文字大小。业务插槽组件若自行指定字号，应消费此上限变量。`unstyled` 模式的排版由宿主负责。

Mermaid 的字号通过 fontBaseSize 驱动整图缩放，不直接改写已布局 SVG 内部的 16px 测量字号。图表上限按该基础字号换算缩放宽度，图类内部特有的标题/标注比例仍保留；公式内部也保留数学排版比例，因此统一上限不表示第三方图表或公式中每个特殊字形都被独立截断。
