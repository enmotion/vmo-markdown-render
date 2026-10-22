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

基础字号只作用于 `.markdown-render__content`，不修改页面根字号与外壳字号。标题和 em 间距随字号缩放；业务组件应使用 em 或 `--md-size`，固定 px 不会自动缩放。图片和 Mermaid 会换算为 em，并受最大宽度限制。外层宽高、padding、margin、滚动由宿主布局控制。

## unstyled

```vue
<MarkdownRender class="custom-markdown" :content="content" unstyled />
```

`unstyled` 去掉根元素的 `md-styled` 类，保留语义 DOM、组件、事件、主题状态和规则处理。它不会卸载已导入的 CSS，也不会移除独立导入的 KaTeX 样式。可以通过宿主 class 编写自己的排版；在 Vue scoped 样式中使用 `:deep()` 选择内部节点。
