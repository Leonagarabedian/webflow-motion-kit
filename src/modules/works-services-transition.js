import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  servicesLayoutSelector: ".services-layout",
  worksGallerySelector: '[data-motion~="branda-spatial-works"]',
  zIndex: 0,
  interactionSyncTriggerId: "mk-branda-spatial-works",
  interactionHandoffProgress: 0.9
});

export const worksServicesTransition = {
  name: "works-services-transition",
  category: "composition",
  selector: '[data-motion~="works-services-transition"]',

  mount(root, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    const servicesLayoutSelector = readString(
      root,
      "motion-services-layout-selector",
      DEFAULTS.servicesLayoutSelector
    );
    const worksGallerySelector = readString(
      root,
      "motion-works-gallery-selector",
      DEFAULTS.worksGallerySelector
    );
    const zIndex = readNumber(root, "motion-services-z-index", DEFAULTS.zIndex);
    const interactionSyncTriggerId = readString(
      root,
      "motion-interaction-sync-trigger-id",
      DEFAULTS.interactionSyncTriggerId
    );
    const interactionHandoffProgress = Math.min(
      1,
      Math.max(
        0,
        readNumber(
          root,
          "motion-interaction-handoff-progress",
          DEFAULTS.interactionHandoffProgress
        )
      )
    );

    const servicesLayout = root.querySelector(servicesLayoutSelector);
    const worksGallery = root.querySelector(worksGallerySelector);
    if (!servicesLayout || !worksGallery) return;

    const originalRootStyle = root.getAttribute("style");
    const originalServicesStyle = servicesLayout.getAttribute("style");
    const originalWorksStyle = worksGallery.getAttribute("style");
    const originalWorksPointerEvents = worksGallery.style.pointerEvents;

    // The DOM is now permanent: Works gallery and the real Services layout are
    // siblings inside the same pinned wrapper. This composition only establishes
    // layering/geometry. Individual motion modules own their own animation.
    if (window.getComputedStyle(root).position === "static") {
      gsap.set(root, { position: "relative" });
    }

    gsap.set(root, { overflow: "visible" });

    gsap.set(worksGallery, {
      position: "relative",
      zIndex: zIndex + 2
    });

    gsap.set(servicesLayout, {
      position: "absolute",
      left: 0,
      top: "50%",
      width: "100%",
      margin: 0,
      yPercent: -50,
      zIndex,
      pointerEvents: "auto"
    });

    let destroyed = false;
    let interactionRaf = null;
    let interactionTrigger = null;
    let worksInteractive = null;

    const setWorksInteractive = (interactive) => {
      if (interactive === worksInteractive) return;
      worksInteractive = interactive;

      if (interactive) {
        if (originalWorksPointerEvents) {
          worksGallery.style.pointerEvents = originalWorksPointerEvents;
        } else {
          worksGallery.style.removeProperty("pointer-events");
        }
      } else {
        worksGallery.style.pointerEvents = "none";
      }
    };

    const syncInteraction = () => {
      if (destroyed) return;

      interactionTrigger =
        ScrollTrigger.getById(interactionSyncTriggerId) || null;

      if (interactionTrigger) {
        setWorksInteractive(
          interactionTrigger.progress < interactionHandoffProgress
        );
      }

      interactionRaf = requestAnimationFrame(syncInteraction);
    };

    setWorksInteractive(true);
    interactionRaf = requestAnimationFrame(syncInteraction);

    return () => {
      destroyed = true;
      if (interactionRaf != null) cancelAnimationFrame(interactionRaf);
      if (originalRootStyle == null) root.removeAttribute("style");
      else root.setAttribute("style", originalRootStyle);

      if (originalServicesStyle == null) servicesLayout.removeAttribute("style");
      else servicesLayout.setAttribute("style", originalServicesStyle);

      if (originalWorksStyle == null) worksGallery.removeAttribute("style");
      else worksGallery.setAttribute("style", originalWorksStyle);
    };
  }
};
