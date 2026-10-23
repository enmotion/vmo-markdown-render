import type { MentionPlacement } from './types';

export interface MentionRect { left: number; top: number; bottom: number; width: number }
export interface MentionViewport { left: number; top: number; width: number; height: number }

/** 优先遵循方向配置，空间不足时翻转；最终尺寸与位置限制在可视视口内。 */
export function placeMentionMenu(anchor: MentionRect, container: MentionRect, desiredHeight: number, viewport: MentionViewport, placement: MentionPlacement, offset: number) {
  const gap = Number.isFinite(offset) && offset >= 0 ? offset : 6;
  const width = Math.max(0, Math.min(300, container.width, viewport.width - 16));
  const heightLimit = Math.max(0, viewport.height - 16);
  const above = Math.max(0, Math.min(heightLimit, anchor.top - viewport.top - 8 - gap));
  const below = Math.max(0, Math.min(heightLimit, viewport.top + viewport.height - 8 - anchor.bottom - gap));
  let side: 'top' | 'bottom' = placement === 'top' ? 'top' : 'bottom';
  const preferred = side === 'top' ? above : below;
  const opposite = side === 'top' ? below : above;
  if (preferred < desiredHeight && opposite > preferred) side = side === 'top' ? 'bottom' : 'top';
  const available = side === 'top' ? above : below;
  const height = Math.min(desiredHeight, available);
  const x = Math.max(viewport.left + 8, Math.min(anchor.left, viewport.left + viewport.width - 8 - width));
  const y = side === 'top' ? anchor.top - gap - height : anchor.bottom + gap;
  const top = Math.max(viewport.top + 8, Math.min(y, viewport.top + viewport.height - 8 - height));
  return { placement: side, left: x - container.left, top: top - container.top, width, maxHeight: available };
}
