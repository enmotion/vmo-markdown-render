// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import MarkdownRender from '../../components/markdown-render/markdown-render.vue';

it('媒体围栏渲染原生控件，保留普通链接并跳过正文规则', () => {
  const w = mount(MarkdownRender, { props: {
    content: '```audio\n/media/sample.mp3\n```\n\n```video\nhttps://example.com/movie.mp4\n```\n\n[普通链接](/movie.mp4)',
    textRules: [{ pattern: /sample/g, replace: 'changed' }],
  } });
  expect(w.find('audio').attributes()).toMatchObject({ src: '/media/sample.mp3', controls: '', preload: 'metadata' });
  expect(w.find('video').attributes()).toMatchObject({ src: 'https://example.com/movie.mp4', controls: '', playsinline: '' });
  expect(w.find('a').attributes('href')).toBe('/movie.mp4');
  expect(w.findAll('video')).toHaveLength(1);
  w.unmount();
});

it('媒体拒绝危险协议，多行配置保留为代码块', async () => {
  const w = mount(MarkdownRender, { props: { content: '```video\njavascript:alert(1)\n```' } });
  expect(w.find('video').attributes('src')).toBeUndefined();
  await w.setProps({ content: '```audio\n/media/a.mp3\nextra\n```' });
  expect(w.find('audio').exists()).toBe(false);
  w.unmount();
});

it('标准与高级图片统一解析，媒体属性白名单与百分比宽度', async () => {
  const w = mount(MarkdownRender, { props: { content: `![标准](./plain.png "标题")

::image[高级图片]{src="./advanced" width="60%" title="高级标题" onclick="evil" style="display:none" future="kept"}

::audio[录音]{src="./recording" type="audio/mpeg" autoplay="true"}

::video[演示]{src="./movie" type="video/mp4" poster="./cover.png" width="80%" height="1px"}`, baseUrl: 'https://example.com/docs/' } });
  expect(w.findAll('img')).toHaveLength(2);
  expect(w.findAll('img')[0].attributes()).toMatchObject({ alt: '标准', title: '标题' });
  const advanced = w.findAll('img')[1];
  expect(advanced.attributes('style')).toContain('width: 60%');
  expect(advanced.attributes('onclick')).toBeUndefined();
  expect(advanced.attributes('future')).toBeUndefined();
  expect(w.find('audio source').attributes()).toMatchObject({ src: 'https://example.com/docs/recording', type: 'audio/mpeg' });
  expect(w.find('audio').attributes('autoplay')).toBeUndefined();
  expect(w.find('video source').attributes('src')).toBe('https://example.com/docs/movie');
  expect(w.find('video').attributes('poster')).toBe('https://example.com/docs/cover.png');
  expect(w.find('video').attributes('style')).toContain('width: 80%');
  expect(w.find('video').attributes('height')).toBeUndefined();
  for (const width of ['0%', '101%', '640', '50px', 'calc(50%)', '-1%']) {
    await w.setProps({ content: `::image[x]{src="/x" width="${width}"}` });
    expect(w.find('img').attributes('style')).toContain('width: 100%');
  }
  await w.setProps({ content: '::video[x]{src="javascript:evil" poster="data:evil" width=".5%"}' });
  expect(w.find('video').attributes('src')).toBeUndefined();
  expect(w.find('video').attributes('poster')).toBeUndefined();
  expect(w.emitted('error')).toHaveLength(2);
  w.unmount();
});

it('残缺、未知、代码中的指令不挂载，流式原文完整后才加载资源', async () => {
  const w = mount(MarkdownRender, { props: { streaming: true, content: '::image[x]{src="/x"' } });
  expect(w.find('img').exists()).toBe(false);
  await w.setProps({ content: '::image[x]{src="/x"}' });
  expect(w.find('img').attributes('src')).toBe('/x');
  await w.setProps({ streaming: false, content: '::unknown[x]{src="/x"}\n\n::image[x]{width="60%"}\n\n`::image[x]{src="/x"}`\n\n```md\n::video[x]{src="/v"}\n```' });
  expect(w.find('img, video, audio').exists()).toBe(false);
  expect(w.text()).toContain('::unknown');
  w.unmount();
});

it('metadata 就绪后使用视频原始比例，零尺寸 metadata 不覆盖布局', async () => {
  const w = mount(MarkdownRender, { props: { content: '::video[演示]{src="/video" poster="/cover" width="80%"}' } });
  const video = w.find('video');
  const dimensions = (width: number, height: number) => {
    Object.defineProperty(video.element, 'videoWidth', { configurable: true, value: width });
    Object.defineProperty(video.element, 'videoHeight', { configurable: true, value: height });
  };
  dimensions(0, 0); await video.trigger('loadedmetadata');
  expect(video.element.style.aspectRatio).toBe('');
  dimensions(320, 0); await video.trigger('loadedmetadata');
  expect(video.element.style.aspectRatio).toBe('');
  dimensions(320, 180); await video.trigger('loadedmetadata');
  expect(video.element.style.aspectRatio).toBe('320 / 180');
  expect(video.element.style.width).toBe('80%');
  w.unmount();
});
