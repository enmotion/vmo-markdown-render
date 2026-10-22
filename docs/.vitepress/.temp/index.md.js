import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{"layout":"home","hero":{"name":"Markdown Render","text":"Vue 3 Markdown 渲染组件","tagline":"流式内容、业务组件注入与正则文本转换","actions":[{"theme":"brand","text":"开始使用","link":"/guide/getting-started"},{"theme":"alt","text":"查看 API","link":"/api/markdown-render"}]},"features":[{"title":"组件注入","details":"将已注册标签或正文中的业务标识渲染为真实 Vue 组件。","link":"/guide/components"},{"title":"正则规则","details":"支持纯文本、VNode 和组件输出，明确匹配顺序与边界。","link":"/guide/text-rules"},{"title":"流式与主题","details":"累计 Markdown 渲染、独立亮暗主题、语义色与字号控制。","link":"/guide/markdown"}]},"headers":[],"relativePath":"index.md","filePath":"index.md"}');
const _sfc_main = { name: "index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
