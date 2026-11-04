import type { ImagePreviewOptions } from '../markdown-render/types';

export interface MarkdownImageProps {
  src?: string;
  /** Optional pre-conversion URL; defaults to src in reference events. */
  originalUrl?: string;
  alt?: string;
  title?: string;
  /** CSS width; defaults to 100%. Height retains the image aspect ratio. */
  width?: string;
  /** Show the thumbnail reference action. Default true, independent of preview. */
  reference?: boolean;
  /** Same preview options as Render. Inside Render, its shared preview settings apply. */
  preview?: boolean | ImagePreviewOptions;
  theme?: '' | 'light' | 'dark' | 'auto';
}
