import {
  readNumber,
  readString,
  selectTarget
} from "../core/config.js";

export const pinnedMediaReturn = {
  name: "pinned-media-return",
  category: "component",
  selector: '[data-motion~="pinned-media-return"]',
  mount(element, { gsap }) {
    const media = selectTarget(element, "media", element);
    const minWidth = readNumber(element, "motion-min-width", 992);
    const mm = gsap.matchMedia();

    mm.add(
      {
        desktop: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (!conditions.desktop || conditions.reduceMotion) {
          gsap.set(media, { clearProps: "clipPath,webkitClipPath" });
          return;
        }

        const win = element.ownerDocument.defaultView;
        if (!win) return;

        const maxInset = readNumber(element, "motion-crop-inset", 6);
        const velocityForMax = readNumber(element, "motion-crop-velocity-max", 1400);
        const velocitySmoothing = readNumber(element, "motion-crop-velocity-smoothing", 0.18);
        const responseDuration = readNumber(element, "motion-crop-response-duration", 0.38);
        const responseEase = readString(element, "motion-crop-response-ease", "power2.out");

        media.style.willChange = "clip-path";

        const state = { inset: 0 };
        const render = () => {
          const value = Math.max(0, Math.min(maxInset, state.inset));
          const clip = `inset(${value}% ${value}% ${value}% ${value}%)`;
          media.style.clipPath = clip;
          media.style.webkitClipPath = clip;
        };

        gsap.set(state, { inset: 0 });
        render();

        const moveInset = gsap.quickTo(state, "inset", {
          duration: responseDuration,
          ease: responseEase,
          onUpdate: render
        });

        let rafId = 0;
        let lastY = win.scrollY;
        let lastTime = performance.now();
        let smoothedVelocity = 0;

        const tick = (now) => {
          const currentY = win.scrollY;
          const dt = Math.max(16, now - lastTime);
          const delta = currentY - lastY;
          const rawVelocity = Math.abs(delta) / dt * 1000;

          smoothedVelocity += (rawVelocity - smoothedVelocity) * velocitySmoothing;

          const normalized = Math.min(1, smoothedVelocity / velocityForMax);
          const easedVelocity = 1 - Math.pow(1 - normalized, 2);
          const targetInset = maxInset * easedVelocity;

          moveInset(targetInset);

          lastY = currentY;
          lastTime = now;
          rafId = win.requestAnimationFrame(tick);
        };

        rafId = win.requestAnimationFrame(tick);

        return () => {
          win.cancelAnimationFrame(rafId);
          moveInset.tween?.kill();
          gsap.killTweensOf(state);
          gsap.set(media, { clearProps: "clipPath,webkitClipPath" });
          media.style.willChange = "";
        };
      }
    );

    return () => mm.revert();
  }
};
