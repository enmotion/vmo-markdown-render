// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { it, expect, vi } from 'vitest';
import { useMarkdownTheme } from '../../components/markdown-render/composables/theme';

it('系统主题变更、祖先主题及监听释放', async () => {
  let update!: () => void;
  const media = { matches: false, addEventListener: vi.fn((_e, callback) => { update = callback; }), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => media);
  const preference = ref<'' | 'light' | 'dark' | 'auto'>('auto');
  let state!: ReturnType<typeof useMarkdownTheme>;
  const host = document.createElement('section'); document.body.append(host);
  const w = mount(defineComponent({ setup() {
    const root = ref<HTMLElement>(); state = useMarkdownTheme(preference, root);
    return () => h('div', { ref: root });
  } }), { attachTo: host });
  expect(state.theme.value).toBe('light');
  media.matches = true; update(); await nextTick(); expect(state.theme.value).toBe('dark');
  preference.value = ''; host.classList.add('dark'); await new Promise(r => setTimeout(r, 0));
  expect(state.effectiveTheme.value).toBe('dark');
  host.classList.remove('dark'); await new Promise(r => setTimeout(r, 0));
  expect(state.effectiveTheme.value).toBe('light');
  w.unmount(); expect(media.removeEventListener).toHaveBeenCalledWith('change', update);
  host.remove(); vi.unstubAllGlobals();
});
it('没有 matchMedia 或根元素时安全回退', () => {
  vi.stubGlobal('matchMedia', undefined);
  let state!: ReturnType<typeof useMarkdownTheme>;
  const w = mount(defineComponent({ setup() {
    state = useMarkdownTheme(ref('auto'), ref()); return () => h('div');
  } }));
  expect(state.theme.value).toBe('light'); w.unmount(); vi.unstubAllGlobals();
});
