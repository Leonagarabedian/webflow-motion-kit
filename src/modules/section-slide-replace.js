import { readNumber, readString, resolveTrigger } from "../core/config.js";

export const sectionSlideReplace = {
  name: "section-slide-replace",
  category: "composition",
  selector: '[data-motion~="section-slide-replace"]',

  mount(element, { gsap, ScrollTrigger, reducedMotion }) {
    const lead = element.querySelector('[data-motion-target="slide-replace-lead"]');
    if (!lead) return;

    if (reducedMotion()) {
      gsap.set([element, lead], { clearProps: "transform" });
      return;
    }

    const trigger = resolveTrigger(element);
    const sectionY = readNumber(element, "motion-slide-y", 220);
    const leadFrom = readNumber(element, "motion-lead-from", 90);
    const leadDuration = readNumber(element, "motion-lead-duration", 0.55);
    const sectionDuration = readNumber(element, "motion-slide-duration", 1);
    const overlap = Math.max(0, readNumber(element, "motion-slide-overlap", 0.12));
    const start = readString(element, "motion-start", "bottom 78%");
    const leadEase = readString(element, "motion-lead-ease", "power4.out");
    const sectionEase = readString(element, "motion-slide-ease", "power3.out");

    const originalElementStyle = element.getAttribute("style");
    const originalLeadStyle = lead.getAttribute("style");

    gsap.set(element, { y: sectionY, willChange: "transform" });
    gsap.set(lead, { y: leadFrom, willChange: "transform" });

    const timeline = gsap.timeline({ paused: true });
    timeline
      .to(lead, {
        y: -sectionY,
        duration: leadDuration,
        ease: leadEase
      })
      .to(
        element,
        {
          y: 0,
          duration: sectionDuration,
          ease: sectionEase
        },
        `>-${overlap}`
      )
      .to(
        lead,
        {
          y: 0,
          duration: sectionDuration,
          ease: sectionEase
        },
        "<"
      );

    const scrollTrigger = ScrollTrigger.create({
      trigger,
      start,
      animation: timeline,
      toggleActions: "play none none reverse",
      invalidateOnRefresh: true
    });

    return () => {
      scrollTrigger.kill();
      timeline.kill();
      if (originalElementStyle == null) element.removeAttribute("style");
      else element.setAttribute("style", originalElementStyle);
      if (originalLeadStyle == null) lead.removeAttribute("style");
      else lead.setAttribute("style", originalLeadStyle);
    };
  }
};
