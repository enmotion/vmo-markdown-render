import { createApp, defineComponent, h, ref } from 'vue';
import Render from '../../components/markdown-render/markdown-render.vue';
import Input from '../../components/markdown-input/markdown-input.vue';
import '../../styles/markdown/index.css';
import '../../styles/input/index.css';

createApp(defineComponent({ setup() {
  const theme = ref<'light' | 'dark' | 'auto' | ''>('light');
  const size = ref(16);
  const colors = { lightBackground: '#eeeeee', darkBackground: '#222222' } as const;
  const content = '# Heading\n\n## Second\n\n### Third\n\n#### Fourth\n\n##### Fifth\n\n###### Sixth\n\nBody\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```ts\nconst x = 1\n```\n\n$x$\n\n```mermaid\ngraph LR\n A-->B\n```\n\n> Quote\n\n`code`\n\n> [!NOTE]\n> Detail';
  return () => h('main', [
    ...(['light', 'dark', 'auto', ''] as const).map(value => h('button', { onClick: () => { theme.value = value; } }, value || 'inherit')),
    h('button', { onClick: () => { size.value = 32; } }, 'large'),
    ...[12, 24, 48].map(value => h('button', { onClick: () => { size.value = value; } }, `size-${value}`)),
    h(Render, { id: 'render', theme: theme.value, themeColors: colors, content, fontBaseSize: size.value,
      style: { '--md-h1-font-size': '1.5em', '--md-h2-font-size': '30px', '--md-font-max-size': '26px' } }),
    h(Input, { id: 'input', theme: theme.value, themeColors: colors, placeholder: 'Type', fontBaseSize: size.value, style: { '--md-font-max-size': '26px' }, mentionTriggers: [{ character: '@', source: 'user' }],
      options: [{ value: '1', source: 'user', label: 'Alice' }] }),
    h(Render, { id: 'independent', theme: 'light', themeColors: { lightBackground: '#ffffff', darkBackground: '#000000' }, content }),
  ]);
} })).mount('#app');
