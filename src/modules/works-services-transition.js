import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  servicesLayoutSelector: ".services-layout",
  worksGallerySelector: '[data-motion~="branda-spatial-works"]',
  zIndex: 0
});

export const worksServicesTransition = {
  name: "works-services-transition",
  category: "composition",
  selector: '[data-motion~="works-services-transition"]',

  mount(root, { gsap, reducedMotion }) {
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

    const servicesLayout = root.querySelector(servicesLayoutSelector);
    const worksGallery = root.querySelector(worksGallerySelector);
    if (!servicesLayout || !worksGallery) return;

    const originalRootStyle = root.getAttribute("style");
    const originalServicesStyle = servicesLayout.getAttribute("style");
    const originalWorksStyle = worksGallery.getAttribute("style");

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

    return () => {
      if (originalRootStyle == null) root.removeAttribute("style");
      else root.setAttribute("style", originalRootStyle);

      if (originalServicesStyle == null) servicesLayout.removeAttribute("style");
      else servicesLayout.setAttribute("style", originalServicesStyle);

      if (originalWorksStyle == null) worksGallery.removeAttribute("style");
      else worksGallery.setAttribute("style", originalWorksStyle);
    };
  }
};
