import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Markdown 渲染架构与维护","description":"","frontmatter":{},"headers":[],"relativePath":"markdown-render-architecture.md","filePath":"markdown-render-architecture.md"}');
const _sfc_main = { name: "markdown-render-architecture.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="markdown-渲染架构与维护" tabindex="-1">Markdown 渲染架构与维护 <a class="header-anchor" href="#markdown-渲染架构与维护" aria-label="Permalink to &quot;Markdown 渲染架构与维护&quot;">​</a></h1><h2 id="当前选型" tabindex="-1">当前选型 <a class="header-anchor" href="#当前选型" aria-label="Permalink to &quot;当前选型&quot;">​</a></h2><p>采用 markdown-it 14.3.3 + markdown-it-footnote + markdown-it-task-lists；@markmend/core 仅用于流式语法补全。本库将 token 转为自有 MarkdownNode，再映射至 Vue VNode。KaTeX、Mermaid、highlight.js 动态导入，主入口不包含其运行时代码。</p><p>最初验证了 vue-stream-markdown 2.1.0（MIT）。其默认解析配置对业务 HTML 标签和公式仍需额外适配；本库还需要正文文本节点规则、稳定主题和属性协议，因此选择自行建设薄 Vue 渲染层。未使用候选已移除。没有自建 Markdown 解析器，也不声称完成了所有候选的性能排名。</p><p>保留 ES Module + CommonJS。基础主题约 6 KB（最终以实际构建为准），公式 CSS 与字体独立输出，避免 Vite 库模式内联字体污染基础 CSS。Markdown 解析与增强运行时作为外部依赖；轻量流式补全打包进产物，以便 CommonJS 入口无需同步 require ESM-only 包。复制的第三方资源附带许可证。</p><h2 id="数据流和职责" tabindex="-1">数据流和职责 <a class="header-anchor" href="#数据流和职责" aria-label="Permalink to &quot;数据流和职责&quot;">​</a></h2><ol><li>markdown-render.vue：公共属性、实例 ID、主题与事件、能力组装。</li><li>composables/theme.ts：系统主题监听及卸载清理。</li><li>engine/parse.ts：解析器实例、流式补全、token 到内部节点、标题与脚注 ID。</li><li>engine/extensions.ts：受控业务标签、字符串属性及公式语法。</li><li>engine/alerts.ts：提示类别的单一映射表。</li><li>text-rules/apply.ts：独立的候选匹配、冲突解决及替换，无 Vue 依赖。</li><li>nodes/render.ts：语义节点、组件注册、正文规则、链接安全、目录与提示块。</li><li>nodes/enhanced.ts：异步高亮、公式、图表及复制、错误降级。</li><li>styles/markdown：tokens、基础排版与扩展样式；math.css 由打包脚本复制资源。</li></ol><p>依赖方向为公共组件 → 渲染及解析模块 → 类型/纯函数。外部接口不暴露 markdown-it Token；组件映射为实例数据，不设全局可变注册表。Mermaid 本身使用全局配置，因此增强模块通过队列串行渲染，避免不同主题交叉污染。</p><h2 id="稳定性策略与限制" tabindex="-1">稳定性策略与限制 <a class="header-anchor" href="#稳定性策略与限制" aria-label="Permalink to &quot;稳定性策略与限制&quot;">​</a></h2><p>VNode key 根据 token 结构位置生成，不包含变化的正文内容。正常尾部追加保留前面业务组件；如果 Markdown 结构发生变化，组件可能合理卸载重建。解析当前为全文重新解析，未宣传真正增量解析；流式高频长文需要记录基线并按实际结果引入调度优化。引用和脚注可影响前文，结束态必须完整解析。</p><p>组件标签不使用 HTML 自动补全，完整前不挂载。组件字符串属性拒绝事件、指令及危险渲染属性。原生 HTML 作为文本，不提供任意 Vue 模板编译。公式 trust=false，Mermaid securityLevel=strict，普通链接拒绝危险协议。</p><p>规则只处理文本节点，转换结果不复用 Markdown 解析；不要通过替换生成 HTML 或组件。正则由宿主信任代码提供，复杂同步正则不能强制超时。</p><p>异步增强通过版本号丢弃过期结果；卸载后不回写状态，主题监听与复制计时器及时清理。Mermaid 失败清理临时 DOM。</p><h2 id="扩展入口" tabindex="-1">扩展入口 <a class="header-anchor" href="#扩展入口" aria-label="Permalink to &quot;扩展入口&quot;">​</a></h2><ul><li>新语法：优先选现有 markdown-it 插件，在 parse.ts 映射到内部协议；确需新节点时同步更新 types.ts 和 render.ts。</li><li>新业务组件：宿主传 components 映射，不修改解析器全局状态。</li><li>新规则：配置 textRules；增加冲突、代码隔离、流式边界的行为测试。</li><li>新提示类别：更新 alerts.ts 单一表；现有语义色不变时无需新 CSS。</li><li>新主题：更新 tokens.css 的默认值，保留公共变量的外部继承与缺省回退。</li><li>新增强：独立封装动态加载、失败回退和过期结果处理，不把第三方代码搬到公共入口。</li></ul><p>复用给 markdown-input 的范围包括公共类型、语法约定、主题和纯工具；编辑器不复用渲染器的生命周期状态，也不提供组件注入。单文件原则上不超过 300 行，按职责拆分而非机械拆函数。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("markdown-render-architecture.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const markdownRenderArchitecture = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  markdownRenderArchitecture as default
};
