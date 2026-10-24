import { createApp, defineComponent, h, ref } from 'vue';
import Render from '../../components/markdown-render/markdown-render.vue';
import '../../styles/markdown/index.css';
const graph = '```mermaid\ngraph LR\n A["徐卫东<br/>ENT-123<br/>创始人／负责人"]\n B["沈迟<br/>年轻工程师"]\n A -->|"旧上司与旧部<br/>信任 · 共同创业"| B\n```';
createApp(defineComponent({ setup() {
  const theme = ref<'light' | 'dark'>('light');
  const content = ref(graph);
  const visible = ref(true);
  return () => h('main', { style: 'width:800px' }, [
    h('div', { style: 'position:fixed;top:0;right:0;z-index:10' }, [
      h('button', { onClick: () => { theme.value = 'light'; } }, 'light'),
      h('button', { onClick: () => { theme.value = 'dark'; } }, 'dark'),
      h('button', { onClick: () => { content.value = '```mermaid\nnot valid syntax\n```'; } }, 'fail'),
      h('button', { onClick: () => { visible.value = false; } }, 'unmount'),
    ]),
    h('div', { style: 'height:1000px' }, 'Above diagrams'),
    ...(visible.value ? [0, 1, 2].map(id => h(Render, { key: id, content: content.value, theme: theme.value })) : []),
    h('div', { id: 'tail', style: 'height:1000px' }, 'Below diagrams'),
  ]);
} })).mount('#app');
