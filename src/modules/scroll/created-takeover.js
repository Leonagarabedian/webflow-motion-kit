/** Keep the Created panel and portrait inside one measured frame. */
export function mountCreatedTakeover(root, { gsap, ScrollTrigger }) {
  const frame = root.querySelector('[data-motion-target="takeover-frame"]');
  const panel = root.querySelector('[data-motion-target="takeover-field"]');
  const portrait = root.querySelector('[data-motion-target="takeover-boundary"]');
  if (!frame || !panel || !portrait || panel.parentElement !== frame || portrait.parentElement !== frame) return () => {};

  const mm = gsap.matchMedia();
  mm.add('(min-width: 992px) and (prefers-reduced-motion: no-preference)', () => {
    const originals = new Map([frame, panel, portrait].map(el => [el, el.getAttribute('style')]));
    const restore = el => {
      const value = originals.get(el);
      if (value === null) el.removeAttribute('style');
      else el.setAttribute('style', value);
    };
    const spacer = document.createElement('div');
    spacer.setAttribute('aria-hidden', 'true');
    spacer.dataset.createdPlaceholder = '';
    frame.insertBefore(spacer, panel);
    const progress = { value: 0 };
    let geometry;
    let disposed = false;
    let raf = 0;

    function render() {
      if (!geometry) return;
      const p = Math.max(0, Math.min(1, progress.value));
      const { left, top, width, height, endWidth, endHeight, travel } = geometry;
      gsap.set(panel, {
        left, top,
        width: width + (endWidth - width) * p,
        height: height + (endHeight - height) * p
      });
      gsap.set(portrait, { x: travel * p });
    }

    function measure() {
      // Restore natural layout before measuring; never measure a transformed child.
      spacer.style.display = 'none';
      [frame, panel, portrait].forEach(restore);
      gsap.set(portrait, { x: 0 });
      gsap.set(frame, { position: 'relative', overflow: 'hidden', isolation: 'isolate', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' });
      const f = frame.getBoundingClientRect();
      const a = panel.getBoundingClientRect();
      const b = portrait.getBoundingClientRect();
      const left = a.left - f.left - frame.clientLeft;
      const top = a.top - f.top - frame.clientTop;
      geometry = {
        left, top, width: a.width, height: a.height,
        endWidth: Math.max(a.width, frame.clientWidth - left),
        endHeight: Math.max(a.height, frame.clientHeight - top),
        travel: Math.max(0, frame.clientWidth - (b.left - f.left - frame.clientLeft))
      };
      Object.assign(spacer.style, { display: 'block', height: `${a.height}px`, minWidth: '0', pointerEvents: 'none', visibility: 'hidden', gridColumn: '1', gridRow: '1' });
      gsap.set(panel, { position: 'absolute', boxSizing: 'border-box', minHeight: 0, maxWidth: 'none', margin: 0, zIndex: 1 });
      gsap.set(portrait, { position: 'relative', gridColumn: '2', gridRow: '1', zIndex: 2 });
      render();
    }

    measure();
    const tween = gsap.to(progress, {
      value: 1, ease: 'none', onUpdate: render,
      scrollTrigger: {
        id: 'branda-created-review', trigger: frame,
        start: 'top 75%', end: 'top 15%', scrub: 0.35,
        invalidateOnRefresh: true,
        onRefreshInit: measure,
        onRefresh: render
      }
    });
    function requestRefresh() {
      if (disposed || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!disposed) ScrollTrigger.refresh();
      });
    }
    const images = [...root.querySelectorAll('img')];
    images.forEach(img => img.addEventListener('load', requestRefresh));
    document.fonts?.ready.then(requestRefresh);
    requestRefresh();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      images.forEach(img => img.removeEventListener('load', requestRefresh));
      tween.scrollTrigger?.kill();
      tween.kill();
      spacer.remove();
      [frame, panel, portrait].forEach(restore);
    };
  });
  return () => mm.revert();
}

export const createdTakeover = {
  name: "created-takeover",
  category: "composition",
  selector: '[data-motion~="created-takeover"]',
  mount(element, { gsap, ScrollTrigger }) {
    return mountCreatedTakeover(element, { gsap, ScrollTrigger });
  }
};
