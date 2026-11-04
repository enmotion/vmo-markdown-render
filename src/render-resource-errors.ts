import type { ResourceUrlResolver } from '../components/markdown-render/types';

/** Demo-only injection: deliberately return missing URLs or fail URL resolution. */
export const resolveErrorDemoUrl: ResourceUrlResolver = (url, { type }) => {
  if (url === '/demo-resource/resolver-throws') throw new Error('演示：资源地址转换失败');
  if (url === '/demo-resource/resolver-empty') return '';
  if (url === '/demo-resource/missing') {
    const extension = { image: 'png', audio: 'mp3', video: 'mp4' }[type];
    return `/__resource-error-demo__/missing-${type}.${extension}`;
  }
  return url;
};

export function resourceErrorSource(image: string) {
  return `# 资源加载失败示例

这里故意使用不存在的地址。你可以修改左侧源码，或点击坏图查看大图预览的失败提示。

## 1. 普通图片：地址错误

下面仍会生成图片元素，由浏览器显示破图、替代文字或空白；没有组件自带的错误占位。

![这张图片的地址不存在](/__resource-error-demo__/direct-missing.png)

## 2. 注入的图片：地址转换成功，资源不存在

这三个媒体使用相同的业务地址，演示回调根据资源类型转换成不同的不存在地址。

::image[注入的图片加载失败]{src="/demo-resource/missing"}

## 3. 注入的音频：资源不存在

原生音频控件仍保留，无法正常播放。

::audio[注入的音频加载失败]{src="/demo-resource/missing"}

## 4. 注入的视频：资源不存在

原生视频元素仍保留，无法正常播放；具体画面和提示由浏览器决定。

::video[注入的视频加载失败]{src="/demo-resource/missing"}

## 5. 地址转换失败

这张图片的转换回调抛异常，组件移除 src。图片元素仍保留。

::image[地址转换抛异常的图片]{src="/demo-resource/resolver-throws"}

这段音频的转换回调返回空字符串，组件也会移除 src；音频控件仍保留。

::audio[地址转换返回空字符串的音频]{src="/demo-resource/resolver-empty"}

## 6. 正常图片对照

前面的错误没有阻止后续内容渲染。下面使用项目自带图片，应正常显示。

::image[正常图片对照]{src="${image}" width="60%"}

**这段结尾文字也应正常显示。**
`;
}
