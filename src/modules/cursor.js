import { readNumber, selectTarget } from "../core/config.js";

export const cursor = {
  name: "cursor",
  selector: '[data-motion~="cursor"]',
  mount(element, { gsap, reducedMotion, supportsHover }) {
    const target = selectTarget(element, "cursor", null);
    if (!target || reducedMotion() || !supportsHover()) return;

    const follow = readNumber(element, "motion-follow", 0.2);
    const xTo = gsap.quickTo(target, "x", { duration: follow, ease: "power3.out" });
    const yTo = gsap.quickTo(target, "y", { duration: follow, ease: "power3.out" });
    gsap.set(target, { autoAlpha: 0, scale: 0, xPercent: -50, yPercent: -50 });

    const onMove = (event) => {
      const rect = element.getBoundingClientRect();
      xTo(event.clientX - rect.left);
      yTo(event.clientY - rect.top);
    };
    const onEnter = () =>
      gsap.to(target, {
        autoAlpha: 1,
        duration: readNumber(element, "motion-enter-duration", 0.6),
        ease: "back.out(1.8)",
        overwrite: "auto",
        scale: 1
      });
    const onLeave = () =>
      gsap.to(target, {
        autoAlpha: 0,
        duration: readNumber(element, "motion-leave-duration", 0.38),
        ease: "power3.in",
        overwrite: "auto",
        scale: 0
      });

    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerenter", onEnter);
    element.addEventListener("pointerleave", onLeave);

    return () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerenter", onEnter);
      element.removeEventListener("pointerleave", onLeave);
      xTo.tween?.kill();
      yTo.tween?.kill();
      gsap.killTweensOf(target);
      gsap.set(target, { clearProps: "all" });
    };
  }
};
