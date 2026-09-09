import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  servicesSelector: "[data-services-transition-section]",
  introSelector: ".services-intro",
  syncTriggerId: "mk-branda-spatial-works",
  anchorY: 0.5,
  zIndex: 0
});

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
    const originalRect = servicesSection.getBoundingClientRect();

    // Preserve the real Services section's place in document flow while the
    // same DOM is temporarily staged inside the pinned Works composition.
    const placeholder = document.createElement("div");
    placeholder.setAttribute("data-works-services-placeholder", "");
    placeholder.style.width = "100%";
    placeholder.style.height = `${Math.max(1, originalRect.height)}px`;
    placeholder.style.pointerEvents = "none";
    placeholder.style.visibility = "hidden";
    originalParent.insertBefore(placeholder, servicesSection);

    let staged = false;
    let syncTrigger = null;
    let rafId = null;
    let destroyed = false;
    let stageOffsetY = 0;

    const restoreOriginalInlineStyle = () => {
      if (originalStyle == null) servicesSection.removeAttribute("style");
      else servicesSection.setAttribute("style", originalStyle);
    };

    const applyStageStyle = () => {
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
        y: stageOffsetY,
        zIndex,
        backgroundColor: "transparent",
        backgroundImage: "none",
        pointerEvents: "auto",
        willChange: "transform"
      });
    };

    const measureStageOffset = () => {
      if (servicesSection.parentElement !== root) return stageOffsetY;

      gsap.set(servicesSection, { y: 0 });
      const stageRect = root.getBoundingClientRect();
      const intro = servicesSection.querySelector(introSelector);
      if (!intro) return stageOffsetY;

      const introRect = intro.getBoundingClientRect();
      const desiredCenterY = stageRect.top + stageRect.height * anchorY;
      const introCenterY = introRect.top + introRect.height / 2;
      stageOffsetY = desiredCenterY - introCenterY;
      return stageOffsetY;
    };

    const ensureStage = () => {
      if (staged && servicesSection.parentElement === root) return;

      placeholder.style.display = "block";
      root.appendChild(servicesSection);
      staged = true;
      measureStageOffset();
      applyStageStyle();
    };

    const ensureHome = () => {
      if (!staged && servicesSection.parentElement === originalParent) return;

      if (placeholder.parentNode === originalParent) {
        originalParent.insertBefore(servicesSection, placeholder);
      } else if (originalNextSibling?.parentNode === originalParent) {
        originalParent.insertBefore(servicesSection, originalNextSibling);
      } else {
        originalParent.appendChild(servicesSection);
      }

      staged = false;
      restoreOriginalInlineStyle();
      placeholder.style.display = "none";
    };

    const realignStage = () => {
      if (!staged || servicesSection.parentElement !== root) return;
      measureStageOffset();
      applyStageStyle();
    };

    ensureStage();
    requestAnimationFrame(realignStage);
    window.addEventListener("resize", realignStage, { passive: true });

    const update = () => {
      if (destroyed) return;

      syncTrigger = syncTrigger || ScrollTrigger.getById(syncTriggerId);
      if (syncTrigger) {
        // Keep Services staged throughout the Works pin. The moment the pin
        // actually releases, return the same real section to its reserved flow
        // position so scrolling continues through Services instead of showing
        // a second copy or losing its lower rows/content.
        if (syncTrigger.progress >= 0.9999 && !syncTrigger.isActive) ensureHome();
        else ensureStage();
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);

    return () => {
      destroyed = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", realignStage);
      ensureHome();
      placeholder.remove();
    };
  }
};
