import { expect, it, vi } from 'vitest';
import { createEngine } from '../../use.lib/markdown/engine/parse';
import MarkdownIt from 'markdown-it';
import { installMedia, mediaWidth } from '../../use.lib/markdown/engine/media';

it('显式媒体类型独立于地址后缀，保留扩展属性及原始指令', () => {
  const source = '::video[标签\\]文本]{src="/resource?id=1&amp;k=2" width=50% future="v1"}';
  const node = createEngine(new Set(), 'media')(source, false).nodes[0];
  expect(node.type).toBe('media'); expect(node.tag).toBe('video'); expect(node.value).toBe(source);
  expect(node.attrs).toMatchObject({ src: '/resource?id=1&k=2', alt: '标签]文本', width: '50%', future: 'v1' });
  for (const source of ['::image[x]{src="/x"', '::image[x{src="/x"}', '::image[x]{src="/x"} extra', '::image[x]{src="/x" bad}', '    ::image[x]{src="/x"}']) {
    expect(createEngine(new Set(), 'media')(source, false).nodes.some(node => node.type === 'media')).toBe(false);
  }
  for (const [value, result] of [['100%', '100%'], ['25.5%', '25.5%'], [' .5% ', '0.5%'], ['0%', '100%'], ['101%', '100%'], ['1em', '100%']]) expect(mediaWidth(value)).toBe(result);
});

it('媒体嵌套说明、引号转义与错误属性边界', () => {
  const parse = createEngine(new Set(), 'boundaries');
  const node = parse(`::image[一层[二层]]{ src = '/image' title="a\\"b" }`, false).nodes[0];
  expect(node.type).toBe('media');
  expect(node.attrs).toMatchObject({ alt: '一层[二层]', src: '/image', title: 'a"b' });
  for (const source of [
    '::video', '::image[x]no-attributes', '::image[x]{=bad}',
    '::image[x]{src="unclosed}', '::image[x]{src=}',
    '::image[x]{src="/x"width="50%"}', '::image{src=" "}',
  ]) expect(parse(source, false).nodes.some(node => node.type === 'media'), source).toBe(false);
  expect(mediaWidth()).toBe('100%');
});

it('真实 markdown-it 段落终止探测不吞正文，缩进与流式缺失原行时不挂载', () => {
  const md = new MarkdownIt();
  const registration = vi.spyOn(md.block.ruler, 'before');
  installMedia(md);
  const rule = registration.mock.calls[0][2];
  const source = '::video{src="/v"}';
  const silent = new md.block.State(source, md, {}, []);
  expect(rule(silent, 0, 1, true)).toBe(true);
  expect(silent.tokens).toEqual([]); expect(silent.line).toBe(0);
  const indented = new md.block.State('    ' + source, md, {}, []);
  expect(rule(indented, 0, 1, false)).toBe(false);
  const synthetic = new md.block.State(source, md, { originalMediaLines: [] }, []);
  expect(rule(synthetic, 0, 1, false)).toBe(false);
  const tokens = md.parse('paragraph\n' + source, {});
  expect(tokens.map(token => token.type)).toEqual(['paragraph_open', 'inline', 'paragraph_close', 'media_directive']);
  expect(tokens[1].content).toBe('paragraph');
});
