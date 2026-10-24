import { defineComponent, h } from 'vue';

/** 图片默认铺满内容区，宽高比由浏览器按图片原始尺寸保持。 */
export default defineComponent({
  name: 'MarkdownImage',
  inheritAttrs: false,
  props: { src: String, alt: String, title: String, width: String },
  setup: props => () => h('img', { src: props.src, alt: props.alt, title: props.title, loading: 'lazy', ...(props.width ? { style: { width: props.width, height: 'auto' } } : {}) }),
});
