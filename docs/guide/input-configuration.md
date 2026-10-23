# Input 外观、文案与浮窗

## 完整配置用例

此用例覆盖 theme、fontBaseSize、themeColors、disabled、readonly、unstyled、placeholder、i18n、placement、offset、mobilePlacement、serializeMention 与透明背景配置。

<script setup>
import InputConfiguration from '../examples/InputConfiguration.vue';
</script>

<ClientOnly><InputConfiguration /></ClientOnly>

<<< ../examples/InputConfiguration.vue

共享候选数据文件见 [mention 数据与触发配置](./input-mentions#共享数据与触发配置)。

## 主题、字号与背景

Input 与 Render 共用 `--md-*` 主题变量以及五种语义色。theme 默认空字符串，跟随宿主祖先 `.dark`；light / dark 指定实例模式；auto 跟随系统。默认基础字号 12px，fontBaseSize 非正数或非有限值回退到 12。

```vue
<MarkdownInput theme="auto" :font-base-size="16"
  :theme-colors="{ primary: '#4f46e5', warning: '#b77916', info: '#0284c7', success: '#16804a', danger: '#dc2626' }"
  style="--md-background: transparent; --md-input-max-height: 16em" />
```

themeColors 只接受 primary、warning、info、success、danger，支持 6/8 位十六进制或逗号分隔 rgb/rgba，非法颜色忽略。空缺语义色按主题回退。透明背景由宿主覆盖 `--md-background`，不是单独的 prop。

Input 专用变量：`--md-input-padding`、`--md-input-radius`、`--md-input-max-height`、`--md-mention-color`、`--md-mention-background`、`--md-mention-menu-background`。共用变量见 [CSS 清单](../markdown-styles)。

disabled / readonly 都阻止用户编辑与候选唤起，并隐藏标签删除按钮；disabled 还设置禁用外观与 tabindex=-1。宿主仍可通过 setter 或 v-model 更新内容。

unstyled 移除默认视觉，保留编辑、标签、菜单与定位行为。Markdown 标记不再由默认样式隐藏，宿主需要自行设置排版与外观。它不会卸载已导入的 CSS。

## i18n：外部 KV 覆盖

没有 locale 属性或内置语言切换器。中文默认值保存为完整 KV，通过 computed 与 props.i18n 合并：undefined 不覆盖，空字符串覆盖。宿主切换 KV 即可切换语言；placeholder 属性优先于 i18n.placeholder。

```ts
import { defaultInputI18n, type InputI18n } from 'vmo-markdown-render';
const text: Partial<InputI18n> = {
  placeholder: 'Ask anything…',
  mentionEmpty: 'No results',
  removeMention: 'Remove {label}',
};
console.log(defaultInputI18n.mentionLoading); // 正在搜索…
```

```vue
<MarkdownInput :i18n="text" />
```

| key | 默认中文 |
| --- | --- |
| placeholder | 输入消息… |
| mentionCandidates | 引用候选 |
| mentionSearchLabel | 搜索引用 |
| mentionSearchPlaceholder | 输入关键词搜索 |
| mentionClose | 关闭引用 |
| mentionHint | 输入关键词搜索 |
| mentionLoading | 正在搜索… |
| mentionEmpty | 没有匹配的内容 |
| removeMention | 删除 {label} |
| getterError | 文本导出失败，已使用默认转换保留内容 |
| setterError | 内容导入失败，字符串按普通文字保留，其他无效输入已清空 |

removeMention 支持 `{label}` 字面插值，不解析 HTML。动态切换不重建正文与标签，不改变选区、撤销、查询词或输入法组词，也不重新发起 search。label、source、kind 是业务数据，由宿主翻译；自定义插槽和外部按钮同样由宿主管理。

## 桌面浮窗与移动面板

```vue
<MarkdownInput placement="top" :offset="8" mobile-placement="bottom-sheet" />
```

| 配置 | 行为 |
| --- | --- |
| placement=auto | 优先光标下方 |
| placement=top / bottom | 指定优先方向；该侧不足且另一侧空间更多时翻转 |
| offset | 光标到浮窗的距离，单位 px；默认 6，负数或非有限值回退 6 |
| mobilePlacement=bottom-sheet | 600px 及以下从屏幕底部向上展开，默认值 |
| mobilePlacement=caret | 窄屏也跟随光标，沿用 placement / offset |

光标浮窗保留 8px 视口边距，宽度不超过 300px、容器宽度和视口可用宽度。空间不足则限制高度并内部滚动。滚动、缩放、容器/候选尺寸变化时重新定位；无法测量原始光标时回退输入区域。

底部面板不使用 placement / offset，包含固定搜索行，适配安全区与 visualViewport 软键盘避让。最大高度默认可视视口的 65%；无该 API 时回退 45dvh。系统 prefers-reduced-motion 时取消展开动画。窗口宽度用于模式判定，不按 user-agent 检测设备。

组件就地渲染候选层，继承输入框主题；没有 Teleport 或 append-to-body 配置。宿主布局不要用会裁剪候选层的 overflow 容器，尤其在光标浮窗模式下。
