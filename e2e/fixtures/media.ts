import { createApp, h, ref } from 'vue';
import Render from '../../components/markdown-render/markdown-render.vue';
import '../../styles/markdown/index.css';
const content = `![标准图片](/media/image.svg "标准图片标题")

::image[高级图片]{src="/media/image.svg" width="60%" title="高级图片标题"}

::image[非法宽度回退]{src="/media/image.svg" width="640px"}

::audio[音频]{src="/media/audio.wav" type="audio/wav"}

::video[默认全宽]{src="/media/video.webm" type="video/webm"}

::video[百分比视频]{src="/media/video.webm" type="video/webm" poster="/media/image.svg" width="80%"}

\`\`\`video
/media/video.webm
\`\`\``;
createApp({ setup() {
  const value = ref(content);
  return () => h('main', [h('button', { onClick: () => { value.value = content.split('/media/video.webm').join('/media/video-next.webm'); } }, '切换视频'),
    h(Render, { content: value.value, style: { width: '600px' } })]);
} }).mount('#app');
