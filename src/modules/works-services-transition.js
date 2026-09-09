import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  servicesSelector: "[data-services-transition-section]",
  introSelector: ".services-intro",
  stageSelector: "[data-branda-spatial-pin]",
  anchorY: 0.5,
  zIndex: 0
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

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
    const stageSelector = readString(
      root,
      "motion-services-stage-selector",
      DEFAULTS.stageSelector
    );
    const anchorY = clamp(
      readNumber(root, "motion-services-anchor-y", DEFAULTS.anchorY)
    );
    const zIndex = readNumber(root, "motion-services-z-index", DEFAULTS.zIndex);

    const servicesSection = document.querySelector(servicesSelector);
    if (!servicesSection) return;

    const stage = root.closest(stageSelector) || root.parentElement || root;
    if (stage.contains(servicesSection)) return;

    const originalParent = servicesSection.parentElement;
    const originalNextSibling = servicesSection.nextSibling;
    const originalStyle = servicesSection.getAttribute("style");
    const originalStageStyle = stage.getAttribute("style");
    const originalRootStyle = root.getAttribute("style");

    // The real Services section becomes the final visual state of the Works pin,
    // but it is staged on the pin wrapper rather than inside .work-gallery.
    // .work-gallery must keep overflow:hidden for the WebGL cards, while Services
    // must not be clipped by that gallery viewport.
    stage.appendChild(servicesSection);

    if (window.getComputedStyle(stage).position === "static") {
      gsap.set(stage, { position: "relative" });
    }

    // Keep the WebGL Works layer above Services while cards are still crossing.
    gsap.set(root, { position: "relative", zIndex: zIndex + 1 });

    let rafId = null;
    let destroyed = false;
    let stageY = 0;

    const measure = () => {
      if (
        destroyed ||
        !servicesSection.isConnected ||
        servicesSection.parentElement !== stage
      ) {
        return;
      }

      gsap.set(servicesSection, {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: "auto",
        left: 0,
        width: "100%",
        height: "auto",
        minHeight: "0",
        margin: 0,
        y: 0,
        zIndex,
        backgroundColor: "transparent",
        backgroundImage: "none",
        pointerEvents: "auto",
        willChange: "transform"
      });

      const referenceRect = root.getBoundingClientRect();
      const intro = servicesSection.querySelector(introSelector);

      // During depth-emerge the intro is temporarily portaled into .work-gallery.
      // If it is not currently inside Services, keep the last stable alignment
      // instead of re-measuring from an incomplete layout.
      if (!intro) {
        gsap.set(servicesSection, { y: stageY });
        return;
      }

      const introRect = intro.getBoundingClientRect();
      const desiredIntroCenterY = referenceRect.top + referenceRect.height * anchorY;
      const introCenterY = introRect.top + introRect.height / 2;
      stageY = desiredIntroCenterY - introCenterY;

      gsap.set(servicesSection, { y: stageY });
    };

    // Services stays seated for the entire final handoff. Individual modules
    // animate the intro, rows, and bottom notes. The composition itself does not
    // vertically scroll the whole section, which previously cut rows off.
    measure();
    rafId = requestAnimationFrame(measure);
    window.addEventListener("resize", measure, { passive: true });

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

      if (originalStageStyle == null) stage.removeAttribute("style");
      else stage.setAttribute("style", originalStageStyle);

      if (originalRootStyle == null) root.removeAttribute("style");
      else root.setAttribute("style", originalRootStyle);
    };
  }
};
