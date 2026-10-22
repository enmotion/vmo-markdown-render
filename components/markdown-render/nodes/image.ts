import { defineComponent, h, ref, watch } from 'vue';

/** 图片自然尺寸以 12px 基准换算为 em，随内容字号变化，仍受容器宽度限制。 */
export default defineComponent({
  name: 'MarkdownImage',
  inheritAttrs: false,
  props: { src: String, alt: String, title: String },
  setup(props) {
    const width = ref<number>();
    watch(() => props.src, () => { width.value = undefined; });
    return () => h('img', {
      ...props, loading: 'lazy',
      style: width.value ? { width: `${width.value / 12}em` } : undefined,
      onLoad: (event: Event) => { width.value = (event.target as HTMLImageElement).naturalWidth; },
    });
  },
});
