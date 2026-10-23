import { onBeforeUnmount, onMounted, ref } from 'vue';

/** 固定底部面板跟随可视视口，避开手机软键盘；桌面回退为零。 */
export function useKeyboardInset() {
  const inset = ref(0);
  const height = ref<number>();
  let viewport: VisualViewport | null | undefined;
  const update = () => {
    inset.value = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
    height.value = viewport?.height;
  };
  onMounted(() => {
    viewport = window.visualViewport;
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    update();
  });
  onBeforeUnmount(() => {
    viewport?.removeEventListener('resize', update);
    viewport?.removeEventListener('scroll', update);
  });
  return { inset, height };
}
