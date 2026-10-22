<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, ref } from 'vue';
import { MarkdownRender, type TextRule } from '../index';
const theme = ref<'' | 'light' | 'dark' | 'auto'>('');
const fontBaseSize = ref(12);
const streaming = ref(false);
const source = `# Markdown 展示工作台

[TOC]

## 内容与排版

支持 **强调**、*斜体*、~~删除线~~、[链接](https://commonmark.org) 和行内代码 \`const x = 1\`。

> [!IMPORTANT]
> 标题、链接和默认强调使用 primary。

> [!NOTE]
> 未配置的语义色回退到 primary。

> [!TIP]
> 可以通过 CSS 变量调整主题。

> [!WARNING]
> 这里使用单独配置的 warning。

> [!CAUTION]
> 通过标题和图标区分提示类型。

- [x] 流式展示
- [x] 自定义 Vue 组件
- [x] 多正则转换规则

| 能力 | 支持 |
| --- | --- |
| 主题 | light / dark / auto |
| 尺寸 | fontBaseSize（px） |

## 代码与公式

\`\`\`typescript
const greeting: string = 'Hello Markdown'
console.log(greeting)
\`\`\`

行内公式 $E = mc^2$。

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

## 图表

\`\`\`mermaid
graph LR
  A[Markdown] --> B[Vue 节点]
  B --> C[主题与交互]
\`\`\`

## 业务组件与文本转换

<demo-card user-id="42"></demo-card>

姓名：{"id":"u001","name":"张三"}；订单：ORDER-123。

正文脚注[^demo]。

[^demo]: 流结束后与完整文档使用相同的解析规则。
`;
const content = ref(source);
const rules: TextRule[] = [
  { pattern: /\{"id":"[^"]+","name":"([^"]+)"\}/g, replace: ({ captures }) => h('span',{class:'text-red-500 font-bold px-[.5rem] border rounded'},[captures[0]]) },
  { pattern: /ORDER-(\d+)/g, replace: '订单 $1' },
];
const DemoCard = defineComponent({ props: ['userId'], setup(props) {
  const count = ref(0);
  return () => h('section', { class: 'demo-card bg-gray-200 border border-[#88888820] dark:bg-gray-900' }, [h('strong', `用户卡片 #${props.userId}`), h('p', '这是外部注册的真实 Vue 组件。'), h('button', { onClick: () => count.value++ }, `交互次数 ${count.value}`)]);
} });
const components = { 'demo-card': DemoCard };
let timer: ReturnType<typeof setInterval> | undefined;
const stop = () => { clearInterval(timer); streaming.value = false; };
onBeforeUnmount(stop);
function simulate() {
  stop(); content.value = ''; streaming.value = true;
  let offset = 0;
  timer = setInterval(() => {
    offset += 18; content.value = source.slice(0, offset);
    if (offset >= source.length) stop();
  }, 30);
}
const status = computed(() => streaming.value ? '正在流式生成' : '完整文档');
</script>

<template>
  <main class="demo-shell">
    <header class="demo-header">
      <div><small>VMO / MARKDOWN</small><h1>渲染工作台</h1><p>文档、流式内容与 Vue 组件使用同一套展示规则。</p></div>
      <span class="demo-status">{{ status }}</span>
    </header>
    <section class="demo-toolbar">
      <label>主题 <select v-model="theme"><option value="">跟随宿主</option><option>light</option><option>dark</option><option>auto</option></select></label>
      <label>字号 {{ fontBaseSize }}px <input v-model.number="fontBaseSize" type="range" min="8" max="68" step="1"></label>
      <button @click="simulate">模拟流式</button><button @click="stop">结束流式</button>
      <button @click="stop(); content = source">恢复示例</button>
    </section>
    <div class="demo-grid">
      <section class="demo-source"><h2>Markdown 源码</h2><textarea v-model="content" aria-label="Markdown 源码" spellcheck="false" /></section>
      <section class="demo-preview"><MarkdownRender :content="content" :streaming="streaming" :theme="theme" :theme-colors="{ primary: '#EE9900', danger:'#FF0000', info:'#00DDFF', warning:'#AADD00', success: '#16803c' }" :font-base-size="fontBaseSize" :components="components" :text-rules="rules" /></section>
    </div>
  </main>
</template>

<style>
body { margin: 0; background: #edf0f6; color: #253047; font-family: system-ui, sans-serif; }
* { box-sizing: border-box; }
.demo-shell { width: 100%; min-width: 0; max-width: 1500px; margin: auto; padding: 2.5rem; }
.demo-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.demo-header small { letter-spacing: .18em; color: #6265a0; font-weight: 700; }
.demo-header h1 { font-size: 2rem; margin: .5rem 0; }
.demo-header p { color: #6c7488; }
.demo-status { white-space: nowrap; padding: .5rem .8rem; border-radius: 2rem; background: #e0e2ff; font-size: .85rem; }
.demo-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 1rem; margin: 1.5rem 0; }
.demo-toolbar label { display: flex; align-items: center; gap: .5rem; }
.demo-toolbar :is(button,select) { border: 1px solid #d2d7e4; background: white; padding: .5rem .75rem; border-radius: .5rem; cursor: pointer; }
.demo-grid { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); gap: 1.5rem; align-items: start; height: clamp(24rem, 70vh, 54rem); }
.demo-source, .demo-preview { border: 1px solid #dce0e9; border-radius: .85rem; overflow: hidden; background: white; min-width: 0; min-height: 0; height: 100%; }
.demo-source { display: flex; flex-direction: column; }
.demo-preview { overflow: auto; scrollbar-gutter: stable; }
.demo-source h2 { font-size: .85rem; padding: 1rem; margin: 0; border-bottom: 1px solid #e5e7ef; }
.demo-source textarea { width: 100%; flex: 1; min-height: 0; border: 0; resize: none; padding: 1rem; font: .85rem/1.7 ui-monospace, monospace; color: #47516b; outline-offset: -2px; }
.demo-preview .markdown-render { padding: 1.8rem; }
.demo-card { padding: 1em; border-radius: .5em; }
@media (max-width: 800px) { .demo-shell { padding: 1rem; } .demo-grid { grid-template-columns: 1fr; height: auto; } .demo-source { height: 30vh; } .demo-preview { height: 65vh; } }
</style>
