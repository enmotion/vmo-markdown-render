import { defineComponent, h } from 'vue';

/** 图片默认铺满内容区，宽高比由浏览器按图片原始尺寸保持。 */
export default defineComponent({
  name: 'MarkdownImage',
  inheritAttrs: false,
  props: { src: String, alt: String, title: String },
  setup: props => () => h('img', { ...props, loading: 'lazy' }),
});
