import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  servicesSelector: "[data-services-transition-section]",
  introSelector: ".services-intro",
  syncTriggerId: "mk-branda-spatial-works",
  anchorY: 0.5,
  scrollStart: 0.92,
  scrollEnd: 0.995,
  safeBottom: 24,
  zIndex: 0
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export const worksServicesTransition = {
  name: "works-services-transition",
  category: "composition",
  selector: '[data-motion~="works-services-transition"]',

  mount(root, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    const servicesSelector = readString(
      root,
      "motion-services-selector",
      DEFAULTS.servicesSelector
    );
    const introSelector = readString(
      root,
      "motion-services-intro-selector",
      DEFAULTS.introSelector
    );
    const syncTriggerId = readString(
      root,
      "motion-services-sync-trigger-id",
      DEFAULTS.syncTriggerId
    );
    const anchorY = clamp(
      readNumber(root, "motion-services-anchor-y", DEFAULTS.anchorY)
    );
    const scrollStart = clamp(
      readNumber(root, "motion-services-scroll-start", DEFAULTS.scrollStart)
    );
    const scrollEnd = clamp(
      readNumber(root, "motion-services-scroll-end", DEFAULTS.scrollEnd),
      scrollStart + 0.0001,
      1
    );
    const safeBottom = Math.max(
      0,
      readNumber(root, "motion-services-safe-bottom", DEFAULTS.safeBottom)
    );
    const zIndex = readNumber(root, "motion-services-z-index", DEFAULTS.zIndex);

    const servicesSection = document.querySelector(servicesSelector);
    if (!servicesSection || root.contains(servicesSection)) return;

    const originalParent = servicesSection.parentElement;
    const originalNextSibling = servicesSection.nextSibling;
    const originalStyle = servicesSection.getAttribute("style");

    // The actual Services section becomes the final state of the same pinned
    // Works composition. It is intentionally removed from normal flow for the
    // lifetime of the module, so it cannot reappear as a second section below.
    root.appendChild(servicesSection);

    let syncTrigger = null;
    let rafId = null;
    let destroyed = false;
    let startY = 0;
    let endY = 0;

    const measure = () => {
      if (!servicesSection.isConnected || servicesSection.parentElement !== root) return;

      gsap.set(servicesSection, {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: "auto",
        left: 0,
        width: "100%",
        height: "auto",
        minHeight: "100%",
        margin: 0,
        y: 0,
        zIndex,
        backgroundColor: "transparent",
        backgroundImage: "none",
        pointerEvents: "auto",
        willChange: "transform"
      });

      const stageRect = root.getBoundingClientRect();
      const intro = servicesSection.querySelector(introSelector);
      if (!intro) return;

      const introRect = intro.getBoundingClientRect();
      const servicesRect = servicesSection.getBoundingClientRect();
      const desiredIntroCenterY = stageRect.top + stageRect.height * anchorY;
      const introCenterY = introRect.top + introRect.height / 2;

      startY = desiredIntroCenterY - introCenterY;

      const sectionBottomAtStart = startY + servicesRect.height;
      const desiredBottom = stageRect.height - safeBottom;
      endY = Math.min(startY, startY + (desiredBottom - sectionBottomAtStart));

      gsap.set(servicesSection, { y: startY });
    };

    const applyProgress = (rawProgress) => {
      if (!servicesSection.isConnected || servicesSection.parentElement !== root) return;

      if (rawProgress <= scrollStart) {
        gsap.set(servicesSection, { y: startY });
        return;
      }

      const p = clamp((rawProgress - scrollStart) / (scrollEnd - scrollStart));
      gsap.set(servicesSection, {
        y: startY + (endY - startY) * p
      });
    };

    measure();
    requestAnimationFrame(measure);
    window.addEventListener("resize", measure, { passive: true });

    const update = () => {
      if (destroyed) return;

      syncTrigger = syncTrigger || ScrollTrigger.getById(syncTriggerId);
      if (syncTrigger) applyProgress(syncTrigger.progress);

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);

    return () => {
      destroyed = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measure);

      if (originalParent) {
        if (originalNextSibling?.parentNode === originalParent) {
          originalParent.insertBefore(servicesSection, originalNextSibling);
        } else {
          originalParent.appendChild(servicesSection);
        }
      }

      if (originalStyle == null) servicesSection.removeAttribute("style");
      else servicesSection.setAttribute("style", originalStyle);
    };
  }
};
