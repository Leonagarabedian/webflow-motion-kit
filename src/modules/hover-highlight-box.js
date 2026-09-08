import { readNumber, readString, selectTarget } from "../core/config.js";

export const hoverHighlightBox = {
  name: "hover-highlight-box",
  category: "interaction",
  selector: '[data-motion~="hover-highlight-box"]',
  mount(element, { gsap, reducedMotion, supportsHover }) {
    const box = selectTarget(element, "highlight-box", null);
    const content = selectTarget(element, "highlight-content", element);
    const duration = reducedMotion() ? 0 : readNumber(element, "motion-duration", 0.28);
    const ease = readString(element, "motion-ease", "power2.out");
    const boxColor = readString(element, "motion-box-color", "#111111");
    const textColor = readString(element, "motion-text-color", "#ffffff");
    const scale = readNumber(element, "motion-hover-scale", 1);
    const origin = readString(element, "motion-box-origin", "left center");

    let timeline;

    if (box) {
      gsap.set(box, {
        autoAlpha: 0,
        scaleX: 0,
        transformOrigin: origin
      });

      timeline = gsap.timeline({ paused: true })
        .to(box, {
          autoAlpha: 1,
          scaleX: 1,
          duration,
          ease
        }, 0)
        .to(content, {
          color: textColor,
          scale,
          duration,
          ease
        }, 0);
    } else {
      timeline = gsap.timeline({ paused: true })
        .to(element, {
          backgroundColor: boxColor,
          color: textColor,
          scale,
          duration,
          ease
        }, 0);
    }

    const enter = () => timeline.play();
    const leave = () => timeline.reverse();

    if (!supportsHover || supportsHover()) {
      element.addEventListener("pointerenter", enter);
      element.addEventListener("pointerleave", leave);
    }
    element.addEventListener("focusin", enter);
    element.addEventListener("focusout", leave);

    return () => {
      element.removeEventListener("pointerenter", enter);
      element.removeEventListener("pointerleave", leave);
      element.removeEventListener("focusin", enter);
      element.removeEventListener("focusout", leave);
      timeline.kill();
      if (box) gsap.set(box, { clearProps: "opacity,visibility,transform" });
      gsap.set(content, { clearProps: "color,transform" });
      if (!box) gsap.set(element, { clearProps: "backgroundColor,color,transform" });
    };
  }
};
