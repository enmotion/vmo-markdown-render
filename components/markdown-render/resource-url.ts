import type { MarkdownError, MarkdownRenderProps, ResourceUrlContext } from './types';

/** 同步解析内置媒体地址；失败时移除 src，避免误请求页面自身。 */
export function resolveResource(
  originalUrl: string,
  type: ResourceUrlContext['type'],
  props: MarkdownRenderProps,
  report: (error: MarkdownError) => void,
): string | undefined {
  if (!originalUrl.trim()) return undefined;
  try {
    const safe = (url: string) => {
      const normalized = url.replace(/[\u0000-\u0020\u007f]/g, '');
      return !/^[a-z][a-z\d+.-]*:/i.test(normalized) || /^https?:/i.test(normalized);
    };
    if (!safe(originalUrl)) throw new Error();
    let url = props.baseUrl ? new URL(originalUrl, props.baseUrl).href : originalUrl;
    if (!safe(url)) throw new Error();
    if (props.resolveUrl) url = props.resolveUrl(url, { type, originalUrl });
    if (typeof url !== 'string' || !url.trim() || !safe(url)) throw new Error();
    return url;
  } catch {
    report({ stage: 'resource', message: '资源地址解析失败，已移除资源地址' });
    return undefined;
  }
}
