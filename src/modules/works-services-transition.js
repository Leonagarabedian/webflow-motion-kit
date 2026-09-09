import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  servicesSelector: "[data-services-transition-section]",
  introSelector: ".services-intro",
  anchorY: 0.5,
  zIndex: 0
});

export const worksServicesTransition = {
  name: "works-services-transition",
  category: "composition",
  selector: '[data-motion~="works-services-transition"]',

  mount(root, { gsap, reducedMotion }) {
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
    const anchorY = Math.min(
      1,
      Math.max(0, readNumber(root, "motion-services-anchor-y", DEFAULTS.anchorY))
    );
    const zIndex = readNumber(root, "motion-services-z-index", DEFAULTS.zIndex);

    const servicesSection = document.querySelector(servicesSelector);
    if (!servicesSection || root.contains(servicesSection)) return;

    const originalParent = servicesSection.parentElement;
    const originalNextSibling = servicesSection.nextSibling;
    const originalStyle = servicesSection.getAttribute("style");

    // Move the real Services section into the pinned Works stage. This removes
    // Services from normal document flow, so after the Works pin releases the
    // next normal-flow section is the section that originally followed Services.
    root.appendChild(servicesSection);

    gsap.set(servicesSection, {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      minHeight: "100%",
      margin: 0,
      zIndex,
      pointerEvents: "auto",
      willChange: "transform"
    });

    const alignServicesToStage = () => {
      if (!servicesSection.isConnected || servicesSection.parentElement !== root) return;

      // Clear only our Y translation before measuring the natural Webflow layout.
      gsap.set(servicesSection, { y: 0 });

      const stageRect = root.getBoundingClientRect();
      const intro = servicesSection.querySelector(introSelector);
      if (!intro) return;

      const introRect = intro.getBoundingClientRect();
      const desiredCenterY = stageRect.top + stageRect.height * anchorY;
      const introCenterY = introRect.top + introRect.height / 2;
      const offsetY = desiredCenterY - introCenterY;

      gsap.set(servicesSection, { y: offsetY });
      servicesSection.__mkWorksServicesOffsetY = offsetY;
    };

    alignServicesToStage();
    const rafId = requestAnimationFrame(alignServicesToStage);
    window.addEventListener("resize", alignServicesToStage, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", alignServicesToStage);
      delete servicesSection.__mkWorksServicesOffsetY;

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
