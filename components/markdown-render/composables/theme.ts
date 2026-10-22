import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

/** 空值保留宿主主题；显式模式只控制实例，不修改 html/body。 */
export function useMarkdownTheme(
  preference: Ref<'' | 'light' | 'dark' | 'auto'>,
  root: Ref<HTMLElement | undefined>,
) {
  const systemDark = ref(false);
  const inheritedDark = ref(false);
  let media: MediaQueryList | undefined;
  let observer: MutationObserver | undefined;
  const updateSystem = () => { systemDark.value = media?.matches ?? false; };
  const updateAncestor = () => { inheritedDark.value = !!root.value?.closest('.dark'); };
  onMounted(() => {
    media = window.matchMedia?.('(prefers-color-scheme: dark)');
    updateSystem();
    media?.addEventListener('change', updateSystem);
    updateAncestor();
    observer = new MutationObserver(updateAncestor);
    // 仅读取 class，兼容宿主运行时切换 .dark，监听随实例卸载释放。
    for (let element = root.value; element; element = element.parentElement ?? undefined) {
      observer.observe(element, { attributes: true, attributeFilter: ['class'] });
    }
  });
  onBeforeUnmount(() => { media?.removeEventListener('change', updateSystem); observer?.disconnect(); });
  const theme = computed(() => preference.value === 'auto' ? systemDark.value ? 'dark' : 'light' : preference.value);
  const effectiveTheme = computed(() => theme.value || (inheritedDark.value ? 'dark' : 'light'));
  return { theme, effectiveTheme };
}
