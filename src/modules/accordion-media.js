import { readNumber } from "../core/config.js";

export const accordionMedia = {
  name: "accordion-media",
  selector: '[data-motion~="accordion-media"]',
  mount(element, { gsap, reducedMotion }) {
    const items = [...element.querySelectorAll("[data-motion-accordion-item]")];
    const media = [...element.querySelectorAll("[data-motion-media]")];
    if (!items.length) return;

    const triggers = items.map((item) =>
      item.querySelector("[data-motion-accordion-trigger]")
    );
    const panels = items.map((item) =>
      item.querySelector("[data-motion-accordion-panel]")
    );
    const duration = reducedMotion()
      ? 0
      : readNumber(element, "motion-duration", 0.65);
    let active = Math.max(
      0,
      items.findIndex((item) => item.hasAttribute("data-motion-active"))
    );

    function apply(index, animate = true) {
      active = index;
      items.forEach((item, itemIndex) => {
        const open = itemIndex === index;
        item.classList.toggle("is-active", open);
        triggers[itemIndex]?.setAttribute("aria-expanded", String(open));
        panels[itemIndex]?.setAttribute("aria-hidden", String(!open));

        if (panels[itemIndex]) {
          gsap.to(panels[itemIndex], {
            autoAlpha: open ? 1 : 0,
            duration: animate ? duration : 0,
            ease: "power3.inOut",
            height: open ? "auto" : 0,
            overwrite: true
          });
        }
        if (media[itemIndex]) {
          gsap.to(media[itemIndex], {
            autoAlpha: open ? 1 : 0,
            duration: animate ? duration : 0,
            ease: "power3.inOut",
            overwrite: true,
            zIndex: open ? 2 : 1
          });
        }
      });
    }

    const listeners = triggers.map((trigger, index) => {
      if (!trigger) return null;
      const listener = () => index !== active && apply(index);
      trigger.addEventListener("click", listener);
      return listener;
    });
    apply(active, false);

    return () => {
      triggers.forEach((trigger, index) => {
        if (trigger && listeners[index]) {
          trigger.removeEventListener("click", listeners[index]);
        }
      });
      gsap.killTweensOf([...panels.filter(Boolean), ...media]);
      gsap.set([...panels.filter(Boolean), ...media], { clearProps: "all" });
      items.forEach((item) => item.classList.remove("is-active"));
    };
  }
};
