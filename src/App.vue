<script setup lang="ts">
import InputDemo from './InputDemo.vue';
import { computed, defineComponent, h, onBeforeUnmount, ref } from 'vue';
import { MarkdownRender, type TextRule } from '../index';
const view = ref(new URLSearchParams(window.location.search).get('view') === 'render' ? 'render' : 'input');
const demoImage = new URL('./assets/markdown-image-demo.png', import.meta.url).href;
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

## 图片

下面使用本地图片，默认铺满内容区宽度，高度按比例自适应；悬停可查看标题。

![紫色山峰与日出的示例插图](${demoImage} "AI 生成山峰日出 · 1774 × 887")

高级图片指令：同一资源按 60% 宽度显示，高度等比。

::image[高级协议山峰插图]{src="${demoImage}" width="60%" title="高级图片 · 60% 宽度"}

## 小说人物关系图

《星核旧事》：围绕王位继承与观星塔旧案，展示三个阵营、十一位人物和两条主线谜团。实线表示明确关系，虚线表示隐秘关系或冲突；可使用图表工具缩放、拖拽查看。

\`\`\`mermaid
flowchart TB
  subgraph royal[王室 · 继承权之争]
    direction LR
    king[萧承渊 · 老国王]
    prince[萧景珩 · 王储]
    princess[萧明昭 · 公主]
    uncle[萧玄策 · 摄政王]
    king -->|父子 · 指定继承人| prince
    king -->|父女 · 隐瞒身世| princess
    king ---|兄弟 · 相互猜忌| uncle
    prince <-->|兄妹 · 共同守护王国| princess
    uncle -.->|争夺王位| prince
  end

  subgraph academy[星辉学院 · 禁术与旧案]
    direction LR
    heroine[林见微 · 见习占星师]
    mentor[沈砚 · 学院导师]
    friend[苏晚棠 · 医师]
    scholar[顾辞 · 档案学者]
    mentor -->|师徒 · 传授星图| heroine
    heroine <-->|挚友 · 共享秘密| friend
    scholar -->|提供失踪档案| heroine
    mentor -.->|封存研究成果| scholar
  end

  subgraph shadow[灰羽会 · 地下情报网]
    direction LR
    leader[闻人烬 · 灰羽首领]
    spy[白鸦 · 双面密探]
    guard[陆沉舟 · 前王室卫队长]
    leader -->|指派潜伏任务| spy
    leader <-->|旧日战友| guard
    spy -.->|怀疑其真实立场| guard
  end

  subgraph mystery[主线谜团]
    relic{失落的星核}
    fire{十年前的观星塔大火}
  end

  prince -->|委托寻找星核| heroine
  heroine <-->|互相信任 · 尚未表明心意| guard
  princess -->|匿名资助调查| scholar
  uncle -->|秘密交易| leader
  spy -.->|伪装效忠 · 传递假情报| uncle
  friend -->|救命之恩| spy
  mentor -.->|曾参与 · 隐瞒真相| fire
  guard -->|唯一幸存证人| fire
  fire -->|线索指向| relic
  heroine -->|能够解读| relic
  leader -->|试图夺取| relic
  king -.->|下令掩埋旧案| fire
\`\`\`

## 音频与视频

音视频使用显式类型媒体指令，显示原生播放控件；旧 audio / video 围栏仍兼容（以下为在线示例资源）。

### 音频：霸王龙吼声

[MDN 资源出处](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/audio)

::audio[霸王龙吼声]{src="https://developer.mozilla.org/shared-assets/audio/t-rex-roar.mp3" type="audio/mpeg"}

### 视频：微风中的花朵

[MDN 资源出处](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers)

::video[微风中的花朵]{src="https://developer.mozilla.org/shared-assets/videos/flower.mp4" type="video/mp4"}

## 业务组件与文本转换

<demo-card user-id="42"></demo-card>

姓名：{"id":"u001","name":"张三"}；订单：ORDER-123。

正文脚注[^demo]。

[^demo]: 流结束后与完整文档使用相同的解析规则。
`;
const content = ref(source);
const rules: TextRule[] = [
  { pattern: /\{"id":"[^"]+","name":"([^"]+)"\}/g, replace: ({ captures }) => h('span',{class:'text-red-500 font-bold px-[.3rem] py-[.2rem] border border-[#00000020] dark:border-[#FFFFFF20] demo-text-match rounded'},[captures[0]]) },
  { pattern: /ORDER-(\d+)/g, replace: '订单 $1' },
];
const DemoCard = defineComponent({ props: ['userId'], setup(props) {
  const count = ref(0);
  return () => h('section', { class: 'demo-card border border-[#88888820]' }, [h('strong', `用户卡片 #${props.userId}`), h('p', '这是外部注册的真实 Vue 组件。'), h('button', { onClick: () => count.value++ }, `交互次数 ${count.value}`)]);
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
    <nav class="demo-switch"><button :aria-pressed="view === 'input'" @click="view = 'input'">聊天输入</button><button :aria-pressed="view === 'render'" @click="view = 'render'">Markdown 展示</button></nav>
    <InputDemo v-if="view === 'input'" />
    <template v-else>
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
      <section class="demo-preview"><MarkdownRender :content="content" :streaming="streaming" :theme="theme" :theme-colors="{ primary: '#EE9900', darkBackground:'#AAFF00', lightBackground:'#004455' }" :font-base-size="fontBaseSize" :components="components" :text-rules="rules" :style="{
        '--md-h1-font-size': '1.4em',
        '--md-h2-font-size': '1.3em',
        '--md-h3-font-size': '1.2em',
        '--md-h4-font-size': '1em',
        '--md-h5-font-size': '1em',
  }" /></section>
    </div>
    </template>
  </main>
</template>

<style>
.demo-switch { display: flex; gap: .5rem; margin-bottom: 1.5rem; }
.demo-switch button { border: 1px solid #d2d7e4; border-radius: .5rem; padding: .6rem 1rem; background: white; cursor: pointer; }
.demo-switch button[aria-pressed="true"] { color: white; background: #6366f1; border-color: #6366f1; }
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
.demo-text-match { background: var(--md-default-surface); }
.demo-card { background: var(--md-default-surface); padding: 1em; border-radius: .5em; }
@media (max-width: 800px) { .demo-shell { padding: 1rem; } .demo-grid { grid-template-columns: 1fr; height: auto; } .demo-source { height: 30vh; } .demo-preview { height: 65vh; } }
</style>
