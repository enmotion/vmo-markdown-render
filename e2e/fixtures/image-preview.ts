import { createApp, h, reactive } from 'vue';
import Render from '../../components/markdown-render/markdown-render.vue';
import type { ImagePreviewOptions, MarkdownRenderProps } from '../../components/markdown-render/types';
import '../../styles/markdown/index.css';

const state = reactive({ theme: 'light' as MarkdownRenderProps['theme'], options: {} as ImagePreviewOptions | boolean, content: '![海边日落](/media/preview-image.svg "海边")' });
Object.assign(window, { previewTest: {
  configure(options: Partial<typeof state>) { Object.assign(state, options); },
  inheritDark(dark: boolean) { document.documentElement.classList.toggle('dark', dark); },
} });
createApp({ setup: () => () => h('main', [
  h(Render, { id: 'preview-source', content: state.content, theme: state.theme, imagePreview: state.options,
    themeColors: { lightBackground: '#f2f4f8', darkBackground: '#121821' }, style: { width: 'min(500px, 100%)' } }),
  h(Render, { id: 'preview-other', content: '![第二实例](/media/preview-image.svg)', theme: 'dark', themeColors: { darkBackground: '#445566' }, style: { width: 'min(300px, 100%)' } }),
]) }).mount('#app');
