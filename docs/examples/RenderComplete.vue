<script setup lang="ts">
import { defineComponent, h, onBeforeUnmount, ref } from 'vue';
import { MarkdownRender, type MarkdownError, type MarkdownHeading, type ResourceUrlResolver,
  type TextRule, type ThemeColors } from 'vmo-markdown-render';
import 'vmo-markdown-render/style.css';
import 'vmo-markdown-render/math.css'; // 不使用公式时可省略。

const UserBadge = defineComponent({
  props: { userId: String },
  setup: props => () => h('span', `用户 ${props.userId}`),
});
const components = { 'user-badge': UserBadge };
const rules: TextRule[] = [{ pattern: /ORDER-(\d+)/g, replace: '订单 $1' }];
const colors: ThemeColors = { primary: '#4f46e5', warning: '#b77916', info: '#0284c7', success: '#16804a', danger: '#dc2626' };
const resolveUrl: ResourceUrlResolver = (url, { originalUrl, type }) =>
  type === 'image' && originalUrl.startsWith('/private/') ? `/api/media?url=${encodeURIComponent(url)}` : url;
const content = ref('# 文档\n\n**重点** ORDER-42\n\n<user-badge user-id="42" />\n\n> [!NOTE]\n> 流式结束后按原文解析。\n\n[打开业务页面](/app/orders/42)\n\n$x^2$');
const streaming = ref(false), unstyled = ref(false);
const headings = ref<MarkdownHeading[]>([]);
const status = ref('');
let timer: ReturnType<typeof setInterval> | undefined;
function startStream() {
  clearInterval(timer);
  content.value = '';
  streaming.value = true;
  const chunks = ['# 流式内容\n\n', '**逐步', '生成**', '\n\n完成。'];
  let index = 0;
  timer = setInterval(() => {
    content.value += chunks[index++]; // 传给 content 的是累计全文。
    if (index === chunks.length) { clearInterval(timer); streaming.value = false; }
  }, 250);
}
function error(event: MarkdownError) { status.value = `${event.stage}: ${event.message}`; }
function link({ href, event }: { href: string; event: MouseEvent }) { event.preventDefault(); status.value = `由宿主接管导航：${href}`; }
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <section class="doc-example">
    <button @click="startStream">模拟流式内容</button><label><input v-model="unstyled" type="checkbox">unstyled</label>
    <MarkdownRender :content="content" :streaming="streaming" theme="auto" :font-base-size="14" :theme-colors="colors"
      :components="components" :text-rules="rules" :alert-labels="{ NOTE: '备注' }" :unstyled="unstyled"
      base-url="https://example.com/docs/" :resolve-url="resolveUrl" @error="error" @headings-change="headings = $event" @link-click="link" />
    <p role="status">{{ status }}</p><pre>{{ headings }}</pre>
  </section>
</template>
