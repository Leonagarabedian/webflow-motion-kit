import { readNumber, readString } from "../core/config.js";

export const hoverBackgroundSwap = {
  name: "hover-background-swap",
  category: "interaction",
  selector: '[data-motion~="hover-background-swap"]',
  mount(element, { gsap, reducedMotion, supportsHover }) {
    const items = [...element.querySelectorAll("[data-motion-background-key]")];
    const targets = [...element.querySelectorAll("[data-motion-background-target]")];
    if (!items.length || !targets.length) return;

    const duration = reducedMotion() ? 0 : readNumber(element, "motion-duration", 0.4);
    const ease = readString(element, "motion-ease", "power2.out");
    const activeOpacity = readNumber(element, "motion-active-opacity", 1);
    const inactiveOpacity = readNumber(element, "motion-inactive-opacity", 0);
    const activeScale = readNumber(element, "motion-active-scale", 1);
    const inactiveScale = readNumber(element, "motion-inactive-scale", 1.02);
    const defaultKey = readString(element, "motion-default-key", null);
    const resetOnLeave = readString(element, "motion-reset-on-leave", "false") === "true";

    const byKey = new Map();
    targets.forEach((target) => {
      const key = target.getAttribute("data-motion-background-target");
      if (key) byKey.set(key, target);
    });

    let activeKey = defaultKey && byKey.has(defaultKey)
      ? defaultKey
      : (targets[0].getAttribute("data-motion-background-target") || null);

    const setInitial = () => {
      targets.forEach((target) => {
        const key = target.getAttribute("data-motion-background-target");
        const isActive = key === activeKey;
        gsap.set(target, {
          autoAlpha: isActive ? activeOpacity : inactiveOpacity,
          scale: isActive ? activeScale : inactiveScale
        });
      });
    };

    const activate = (key) => {
      const next = byKey.get(key);
      if (!next || key === activeKey) return;
      const current = activeKey ? byKey.get(activeKey) : null;

      if (current) {
        gsap.to(current, {
          autoAlpha: inactiveOpacity,
          scale: inactiveScale,
          duration,
          ease,
          overwrite: "auto"
        });
      }

      gsap.to(next, {
        autoAlpha: activeOpacity,
        scale: activeScale,
        duration,
        ease,
        overwrite: "auto"
      });

      activeKey = key;
    };

    const reset = () => {
      if (!defaultKey || !byKey.has(defaultKey)) return;
      activate(defaultKey);
    };

    setInitial();

    const cleanups = [];
    items.forEach((item) => {
      const key = item.getAttribute("data-motion-background-key");
      if (!key || !byKey.has(key)) return;
      const enter = () => activate(key);
      const leave = () => {
        if (resetOnLeave) reset();
      };

      if (!supportsHover || supportsHover()) {
        item.addEventListener("pointerenter", enter);
        item.addEventListener("pointerleave", leave);
      }
      item.addEventListener("focusin", enter);
      item.addEventListener("focusout", leave);

      cleanups.push(() => {
        item.removeEventListener("pointerenter", enter);
        item.removeEventListener("pointerleave", leave);
        item.removeEventListener("focusin", enter);
        item.removeEventListener("focusout", leave);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      gsap.killTweensOf(targets);
      gsap.set(targets, { clearProps: "opacity,visibility,transform" });
    };
  }
};
