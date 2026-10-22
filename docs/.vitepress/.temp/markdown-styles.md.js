import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Markdown 样式变量","description":"","frontmatter":{},"headers":[],"relativePath":"markdown-styles.md","filePath":"markdown-styles.md"}');
const _sfc_main = { name: "markdown-styles.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="markdown-样式变量" tabindex="-1">Markdown 样式变量 <a class="header-anchor" href="#markdown-样式变量" aria-label="Permalink to &quot;Markdown 样式变量&quot;">​</a></h1><p>消费者加载 <code>style.css</code>，公式另加载 <code>math.css</code>。所有变量可在组件 class 或宿主祖先上配置。</p><table tabindex="0"><thead><tr><th>变量</th><th>用途 / 默认</th></tr></thead><tbody><tr><td>--md-primary</td><td>主色；亮色 #4f46e5，暗色 #a5a0ff</td></tr><tr><td>--md-warning / info / success / danger</td><td>可选语义色，缺省回退主色</td></tr><tr><td>--md-heading-color</td><td>全部标题色，缺省主色</td></tr><tr><td>--md-h1-color ～ --md-h6-color</td><td>对应标题色，缺省统一标题色</td></tr><tr><td>--md-text-color</td><td>正文色，按主题默认</td></tr><tr><td>--md-muted-color</td><td>引用等次级文字，按主题默认</td></tr><tr><td>--md-background</td><td>容器背景，按主题默认</td></tr><tr><td>--md-border-color</td><td>边框，按主题默认</td></tr><tr><td>--md-link-color</td><td>链接色，缺省主色</td></tr><tr><td>--md-code-background</td><td>代码背景，按主题默认</td></tr><tr><td>--md-table-header-background</td><td>表头背景，按主题默认</td></tr><tr><td>--md-font</td><td>正文字体，默认系统 sans-serif</td></tr><tr><td>--md-mono-font</td><td>代码字体，默认系统 monospace</td></tr><tr><td>--md-block-spacing</td><td>段落及块间距，默认 1em</td></tr><tr><td>--md-line-height</td><td>正文行高，默认 1.75</td></tr><tr><td>--md-radius</td><td>面板圆角，默认 .5em</td></tr><tr><td>--md-alert-background</td><td>提示块背景，默认语义色 4% 混合</td></tr><tr><td>--md-alert-border</td><td>提示块边框色，默认语义色</td></tr><tr><td>--md-code-keyword / string / number / comment</td><td>代码高亮颜色</td></tr><tr><td>--md-font-base-size</td><td>fontBaseSize 属性写入的 px 基础字号，默认 12px</td></tr><tr><td>--md-size</td><td>默认 var(--md-font-base-size, 12px)，业务组件可以消费或由外部 CSS 覆盖</td></tr></tbody></table><p>局部覆盖使用稳定类，例如 <code>.my-markdown .md-alert-warning</code>。代码块、目录、提示块、图表、表格容器分别为 <code>.md-code-block</code>、<code>.md-toc</code>、<code>.md-alert</code>、<code>.md-mermaid</code>、<code>.md-table-scroll</code>。</p><p>正文段落间距默认 1em，标题字号使用 em。需要细调时可使用实例 class 覆盖这些语义元素。unstyled 模式不应用 <code>.md-styled</code> 下的排版规则，外部可自行定义；第三方公式的 math.css 由消费者选择是否加载。</p><p>字号只设置在 <code>.markdown-render__content</code> 内容层；<code>.markdown-render</code> 外壳保持宿主字号。容器宽高、padding 和 margin 由宿主布局控制；内容增大后自然换行。希望外层高度固定时，由宿主设置固定高度并启用 overflow:auto。</p><p>主题默认空值，组件不添加 .dark 或 data-theme，跟随宿主祖先 .dark；dark/auto 的暗色结果在当前容器添加 .dark。宿主 Tailwind 需采用 class 模式；不操作 html。外部祖先 .dark 不能通过移除实例 class 屏蔽。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("markdown-styles.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const markdownStyles = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  markdownStyles as default
};
