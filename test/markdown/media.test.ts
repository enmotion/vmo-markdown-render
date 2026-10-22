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
