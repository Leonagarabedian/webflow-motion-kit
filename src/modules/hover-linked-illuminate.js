import { readNumber, readString } from "../core/config.js";

export const hoverLinkedIlluminate = {
  name: "hover-linked-illuminate",
  category: "interaction",
  selector: '[data-motion~="hover-linked-illuminate"]',
  mount(element, { gsap, reducedMotion, supportsHover }) {
    const triggers = [...element.querySelectorAll("[data-motion-illuminate-key]")];
    const targets = [...element.querySelectorAll("[data-motion-illuminate-target]")];
    if (!triggers.length || !targets.length) return;

    const duration = reducedMotion() ? 0 : readNumber(element, "motion-duration", 0.28);
    const ease = readString(element, "motion-ease", "power2.out");
    const activeOpacity = readNumber(element, "motion-active-opacity", 1);
    const inactiveOpacity = readNumber(element, "motion-inactive-opacity", 0.35);
    const activeBrightness = readNumber(element, "motion-active-brightness", 1);
    const inactiveBrightness = readNumber(element, "motion-inactive-brightness", 0.7);
    const activeScale = readNumber(element, "motion-active-scale", 1);
    const inactiveScale = readNumber(element, "motion-inactive-scale", 1);
    const defaultKey = readString(element, "motion-default-key", null);
    const resetOnLeave = readString(element, "motion-reset-on-leave", "true") === "true";

    const byKey = new Map();
    targets.forEach((target) => {
      const key = target.getAttribute("data-motion-illuminate-target");
      if (key) byKey.set(key, target);
    });

    const applyTarget = (target, active) => {
      gsap.to(target, {
        opacity: active ? activeOpacity : inactiveOpacity,
        filter: `brightness(${active ? activeBrightness : inactiveBrightness})`,
        scale: active ? activeScale : inactiveScale,
        duration,
        ease,
        overwrite: "auto"
      });
    };

    const deactivateAll = () => targets.forEach((target) => applyTarget(target, false));

    const activate = (key) => {
      targets.forEach((target) => {
        applyTarget(target, target.getAttribute("data-motion-illuminate-target") === key);
      });
    };

    gsap.set(targets, {
      opacity: inactiveOpacity,
      filter: `brightness(${inactiveBrightness})`,
      scale: inactiveScale
    });

    if (defaultKey && byKey.has(defaultKey)) {
      gsap.set(targets, {
        opacity: (index, target) => target.getAttribute("data-motion-illuminate-target") === defaultKey ? activeOpacity : inactiveOpacity,
        filter: (index, target) => `brightness(${target.getAttribute("data-motion-illuminate-target") === defaultKey ? activeBrightness : inactiveBrightness})`,
        scale: (index, target) => target.getAttribute("data-motion-illuminate-target") === defaultKey ? activeScale : inactiveScale
      });
    }

    const cleanups = [];
    triggers.forEach((trigger) => {
      const key = trigger.getAttribute("data-motion-illuminate-key");
      if (!key || !byKey.has(key)) return;

      const enter = () => activate(key);
      const leave = () => {
        if (!resetOnLeave) return;
        if (defaultKey && byKey.has(defaultKey)) activate(defaultKey);
        else deactivateAll();
      };

      if (!supportsHover || supportsHover()) {
        trigger.addEventListener("pointerenter", enter);
        trigger.addEventListener("pointerleave", leave);
      }
      trigger.addEventListener("focusin", enter);
      trigger.addEventListener("focusout", leave);

      cleanups.push(() => {
        trigger.removeEventListener("pointerenter", enter);
        trigger.removeEventListener("pointerleave", leave);
        trigger.removeEventListener("focusin", enter);
        trigger.removeEventListener("focusout", leave);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      gsap.killTweensOf(targets);
      gsap.set(targets, { clearProps: "opacity,filter,transform" });
    };
  }
};
