import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue';

export default defineComponent({
  name: 'MarkdownMermaidView',
  props: { html: { type: String, required: true } },
  setup(props) {
    const viewport = ref<HTMLElement>();
    const canvas = ref<HTMLElement>();
    const scale = ref(1);
    const naturalHeight = ref(0);
    const x = ref(0);
    const y = ref(0);
    const dragging = ref(false);
    let pointer: { id: number; x: number; y: number } | undefined;
    let observer: ResizeObserver | undefined;
    const fit = () => {
      if (!viewport.value || !canvas.value) return;
      naturalHeight.value = canvas.value.offsetHeight;
      scale.value = 1;
      x.value = y.value = 0;
    };
    const zoom = (factor: number) => {
      const next = Math.min(8, Math.max(.1, scale.value * factor));
      const ratio = next / scale.value;
      x.value *= ratio;
      y.value *= ratio;
      scale.value = next;
    };
    const endDrag = (event: PointerEvent) => {
      if (pointer?.id !== event.pointerId) return;
      pointer = undefined;
      dragging.value = false;
      const target = event.currentTarget as HTMLElement;
      if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    };
    onMounted(() => {
      observer = new ResizeObserver(fit);
      observer.observe(canvas.value!);
      fit();
    });
    watch(() => props.html, async () => { await nextTick(); fit(); });
    onBeforeUnmount(() => observer?.disconnect());
    return () => h('div', { class: 'md-mermaid' }, [
      h('div', { class: 'md-mermaid-toolbar', role: 'group', 'aria-label': '图表视图控制' }, [
        h('button', { type: 'button', 'aria-label': '缩小图表', title: '缩小', onClick: () => zoom(1 / 1.25) }, '−'),
        h('button', { type: 'button', 'aria-label': '放大图表', title: '放大', onClick: () => zoom(1.25) }, '+'),
        h('button', { type: 'button', onClick: fit }, '最佳适配'),
      ]),
      h('div', {
        ref: viewport, class: ['md-mermaid-viewport', { 'is-dragging': dragging.value }],
        style: { height: `${naturalHeight.value * Math.max(1, scale.value)}px` },
        tabindex: 0, role: 'region', 'aria-label': '可拖拽图表，使用方向键平移，加减键缩放，Home 键最佳适配',
        onPointerdown: (event: PointerEvent) => {
          if (event.button !== 0 || (event.target as Element).closest('a')) return;
          pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
          dragging.value = true;
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
          event.preventDefault();
        },
        onPointermove: (event: PointerEvent) => {
          if (pointer?.id !== event.pointerId) return;
          x.value += event.clientX - pointer.x;
          y.value += event.clientY - pointer.y;
          pointer.x = event.clientX;
          pointer.y = event.clientY;
        },
        onPointerup: endDrag, onPointercancel: endDrag,
        onLostpointercapture: () => { pointer = undefined; dragging.value = false; },
        onKeydown: (event: KeyboardEvent) => {
          switch (event.key) {
            case '+': case '=': zoom(1.25); break;
            case '-': zoom(1 / 1.25); break;
            case 'Home': fit(); break;
            case 'ArrowLeft': x.value -= 24; break;
            case 'ArrowRight': x.value += 24; break;
            case 'ArrowUp': y.value -= 24; break;
            case 'ArrowDown': y.value += 24; break;
            default: return;
          }
          event.preventDefault();
        },
      }, [h('div', {
        ref: canvas, class: 'md-mermaid-canvas',
        style: { transform: `translate(${x.value}px, ${y.value}px) scale(${scale.value})` },
        innerHTML: props.html,
      })]),
    ]);
  },
});
