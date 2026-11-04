import type { ComputedRef, InjectionKey } from 'vue';
import type { ImageReference } from '../types';

export interface PreviewImage {
  src: string;
  originalUrl?: string;
  alt?: string;
  title?: string;
  naturalWidth?: number;
  naturalHeight?: number;
}
export const imagePreviewKey: InjectionKey<{
  enabled: ComputedRef<boolean>;
  referenceEnabled?: ComputedRef<boolean>;
  reference?(image: ImageReference): void;
  open(image: PreviewImage, owner: symbol): void;
  close(owner: symbol): void;
}> = Symbol('markdown-image-preview');

let activeClose: (() => void) | undefined;
let locks = 0;
let overflow = '';
let overflowPriority = '';
let previousFocus: HTMLElement | null;
/** At most one active lightbox across Render instances; overlapping teardown is safe. */
export function activatePreview(close: () => void) {
  const previous = activeClose; activeClose = close; previous?.();
  if (locks++ === 0) {
    previousFocus = document.activeElement as HTMLElement | null;
    overflow = document.body.style.overflow; overflowPriority = document.body.style.getPropertyPriority('overflow');
    document.body.style.setProperty('overflow', 'hidden');
  }
  return () => {
    if (activeClose === close) activeClose = undefined;
    if (--locks === 0) {
      if (overflow) document.body.style.setProperty('overflow', overflow, overflowPriority);
      else document.body.style.removeProperty('overflow');
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      previousFocus = null;
    }
  };
}
