import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';

interface Point { x: number; y: number }
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const validPoint = (point: Point) => Number.isFinite(point.x) && Number.isFinite(point.y);
export function useImageGestures(stage: Ref<HTMLElement | undefined>, natural: Ref<Point>, maxScale: Ref<number>, longPress: Ref<boolean>, close: () => void, menu: (point?: Point) => void) {
  // The stage fills the viewport. Seed its size so cached images fit on the
  // initial render; measure the actual stage after mounting and on resize.
  const viewport = ref({ x: typeof window === 'undefined' ? 0 : window.innerWidth, y: typeof window === 'undefined' ? 0 : window.innerHeight });
  const scale = ref(1), x = ref(0), y = ref(0), dragging = ref(false);
  const size = computed(() => {
    const ratio = natural.value.x > 0 && natural.value.y > 0
      ? Math.min(1, Math.max(1, viewport.value.x - 48) / natural.value.x, Math.max(1, viewport.value.y - 120) / natural.value.y) : 0;
    return { x: natural.value.x * ratio, y: natural.value.y * ratio };
  });
  const pointers = new Map<number, Point>();
  let base: { points: Point[]; x: number; y: number; scale: number };
  let moved = false, backdrop = false;
  let dismissClick = false;
  let hold: ReturnType<typeof setTimeout> | undefined;
  function cancelHold() { clearTimeout(hold); hold = undefined; }
  function bound() {
    const dx = Math.max(0, (size.value.x * scale.value - viewport.value.x) / 2);
    const dy = Math.max(0, (size.value.y * scale.value - viewport.value.y) / 2);
    x.value = clamp(x.value, -dx, dx); y.value = clamp(y.value, -dy, dy);
  }
  function reset() { scale.value = 1; x.value = y.value = 0; }
  function measure() {
    const rect = stage.value?.getBoundingClientRect();
    const width = rect?.width ?? 0, height = rect?.height ?? 0;
    if (width !== viewport.value.x || height !== viewport.value.y) viewport.value = { x: width, y: height };
    bound();
  }
  function relative(point: Point): Point {
    const rect = stage.value!.getBoundingClientRect();
    return { x: point.x - rect.left - rect.width / 2, y: point.y - rect.top - rect.height / 2 };
  }
  function transform(nextScale: number, nextX: number, nextY: number) {
    // Keep an incomplete/invalid gesture sample from poisoning all later gestures.
    if (!Number.isFinite(nextScale) || !Number.isFinite(nextX) || !Number.isFinite(nextY)) return;
    scale.value = nextScale; x.value = nextX; y.value = nextY; bound();
  }
  function zoom(value: number, anchor: Point = { x: 0, y: 0 }) {
    const next = clamp(value, 1, maxScale.value), ratio = next / scale.value;
    transform(next, anchor.x - (anchor.x - x.value) * ratio, anchor.y - (anchor.y - y.value) * ratio);
  }
  function wheel(event: WheelEvent) {
    menu(); cancelHold();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.value.y : 1);
    zoom(scale.value * Math.exp(-clamp(delta, -1000, 1000) * .002), relative({ x: event.clientX, y: event.clientY }));
  }
  function snapshot() { base = { points: [...pointers.values()].slice(0, 2).map(point => ({ ...point })), x: x.value, y: y.value, scale: scale.value }; }
  function down(event: PointerEvent) {
    if (event.button !== 0 || !validPoint({ x: event.clientX, y: event.clientY })) return;
    dismissClick = false;
    menu(); cancelHold();
    if (!pointers.size) { moved = false; backdrop = event.target === stage.value; }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); snapshot(); dragging.value = true;
    try { stage.value?.setPointerCapture(event.pointerId); } catch { /* Synthetic events may not have an active pointer. */ }
    if (pointers.size > 1) moved = true;
    else if (event.pointerType === 'touch' && longPress.value && !backdrop) {
      hold = setTimeout(() => { moved = true; menu({ x: event.clientX, y: event.clientY }); }, 550);
    }
  }
  function move(event: PointerEvent) {
    if (!pointers.has(event.pointerId) || !validPoint({ x: event.clientX, y: event.clientY })) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.values()].slice(0, 2), start = base.points;
    if (Math.hypot(points[0].x - start[0].x, points[0].y - start[0].y) > 6) { moved = true; cancelHold(); }
    if (points.length > 1 && start.length > 1) {
      const distance = (p: Point[]) => Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y);
      const center = (p: Point[]) => relative({ x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 });
      const from = center(start), to = center(points);
      const next = clamp(base.scale * distance(points) / Math.max(1, distance(start)), 1, maxScale.value);
      const ratio = next / base.scale;
      transform(next, to.x - (from.x - base.x) * ratio, to.y - (from.y - base.y) * ratio);
    } else {
      transform(scale.value, base.x + points[0].x - start[0].x, base.y + points[0].y - start[0].y);
    }
  }
  function up(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return;
    dismissClick = event.type === 'pointerup' && pointers.size === 1 && backdrop && !moved;
    cancelHold(); pointers.delete(event.pointerId); snapshot(); dragging.value = pointers.size > 0;
    if (event.type !== 'pointerup') moved = true;
  }
  function click(event: MouseEvent) {
    // Wait for the compatibility click before unmounting. Closing on pointerup
    // lets a touch-generated click hit the source image and reopen the preview.
    const dismiss = dismissClick && event.target === stage.value;
    dismissClick = false;
    if (dismiss) { event.preventDefault(); event.stopPropagation(); close(); }
  }
  watch(natural, reset);
  watch(maxScale, () => zoom(scale.value));
  onMounted(() => { measure(); window.addEventListener('resize', measure); });
  onBeforeUnmount(() => { cancelHold(); pointers.clear(); window.removeEventListener('resize', measure); });
  return { scale, x, y, size, dragging, reset, zoom, wheel, down, move, up, click };
}
