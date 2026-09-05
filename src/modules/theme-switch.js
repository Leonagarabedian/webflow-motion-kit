import { readNumber, readString } from "../core/config.js";

export const themeSwitch = {
  name: "theme-switch",
  category: "primitive",
  selector: '[data-motion~="theme-switch"]',
  mount(element, { ScrollTrigger, gsap, reducedMotion }) {
    const selector = readString(element, "motion-theme-target", "body");
    const target = document.querySelector(selector);
    if (!target) return;

    const className = readString(element, "motion-theme-class", null);
    const backgroundColor = readString(element, "motion-background", null);
    const color = readString(element, "motion-color", null);
    const duration = reducedMotion() ? 0 : readNumber(element, "motion-duration", 0.5);
    const initialStyle = target.getAttribute("style");
    const initiallyHadClass = className ? target.classList.contains(className) : false;
    const computedStyle = getComputedStyle(target);
    const initialBackground = computedStyle.backgroundColor;
    const initialColor = computedStyle.color;

    const apply = (active) => {
      if (className) target.classList.toggle(className, active);
      const vars = {
        duration,
        ease: readString(element, "motion-ease", "power2.out"),
        overwrite: "auto"
      };
      if (backgroundColor) vars.backgroundColor = active ? backgroundColor : initialBackground;
      if (color) vars.color = active ? color : initialColor;
      if (backgroundColor || color) gsap.to(target, vars);
    };

    const trigger = ScrollTrigger.create({
      end: readString(element, "motion-end", "bottom top"),
      onEnter: () => apply(true),
      onEnterBack: () => apply(true),
      onLeave: () => apply(false),
      onLeaveBack: () => apply(false),
      start: readString(element, "motion-start", "top 50%"),
      trigger: element
    });

    return () => {
      trigger.kill();
      gsap.killTweensOf(target);
      if (className) target.classList.toggle(className, initiallyHadClass);
      if (initialStyle == null) target.removeAttribute("style");
      else target.setAttribute("style", initialStyle);
    };
  }
};
