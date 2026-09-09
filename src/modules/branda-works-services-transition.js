import { readNumber, readString } from "../core/config.js";

const STYLE_ID = "motion-kit-branda-works-services-transition-styles";
const WORKS_SECTION_SELECTOR = "[data-branda-spatial-section]";
const WORKS_TRIGGER_ID = "mk-branda-spatial-works";

const DEFAULTS = Object.freeze({
  itemSelector: ".work-item",
  mediaSelector: ".work-image",
  planeHeight: 4.5,
  gap: 0.65,
  fov: 75,
  cameraZ: 6.15,
  mobileCameraZ: 12.5,
  edgeMargin: 1.15,
  settleProgress: 0.96,
  scaleFrom: 0.58,
  radiusFrom: 28,
  fadePortion: 0.12
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-branda-services-preview] {
      position: absolute;
      inset: 0;
      z-index: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      pointer-events: none;
      transform-origin: center center;
      will-change: transform, opacity, border-radius;
    }

    [data-branda-services-preview] > [data-branda-services-preview-inner] {
      width: 100%;
      height: 100%;
      min-height: 100%;
      overflow: hidden;
    }

    [data-branda-services-preview] [data-motion],
    [data-branda-services-preview] [data-motion-target] {
      pointer-events: none !important;
    }
  `;
  doc.head.appendChild(style);
}

function getMediaAspect(media) {
  if (!media) return 16 / 9;

  if (media instanceof HTMLVideoElement) {
    const width = media.videoWidth || media.getAttribute("width");
    const height = media.videoHeight || media.getAttribute("height");
    const ratio = Number(width) / Number(height);
    return Number.isFinite(ratio) && ratio > 0 ? ratio : 16 / 9;
  }

  const width = media.naturalWidth || media.getAttribute("width");
  const height = media.naturalHeight || media.getAttribute("height");
  const ratio = Number(width) / Number(height);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 16 / 9;
}

function stripInteractiveState(node) {
  node.removeAttribute?.("id");
  node.removeAttribute?.("data-motion");
  node.removeAttribute?.("data-motion-target");

  Array.from(node.attributes || []).forEach((attribute) => {
    if (attribute.name.startsWith("data-motion-")) {
      node.removeAttribute(attribute.name);
    }
  });

  node.querySelectorAll?.("*").forEach((child) => {
    child.removeAttribute("id");
    child.removeAttribute("data-motion");
    child.removeAttribute("data-motion-target");
    Array.from(child.attributes || []).forEach((attribute) => {
      if (attribute.name.startsWith("data-motion-")) {
        child.removeAttribute(attribute.name);
      }
    });

    if (child.matches("a, button, input, textarea, select, [tabindex]")) {
      child.setAttribute("tabindex", "-1");
    }
  });
}

function resolveTarget(root, worksSection) {
  const selector = readString(root, "motion-services-target", "");
  if (selector) {
    return root.ownerDocument.querySelector(selector);
  }
  return worksSection.nextElementSibling;
}

function createPreview(root, target) {
  const preview = root.ownerDocument.createElement("div");
  preview.setAttribute("data-branda-services-preview", "");
  preview.setAttribute("aria-hidden", "true");

  const clone = target.cloneNode(true);
  stripInteractiveState(clone);
  clone.setAttribute("data-branda-services-preview-inner", "");
  preview.appendChild(clone);
  root.prepend(preview);
  return preview;
}

function getCenterCrossProgress(root, items, mediaSelector, planeHeight, gap, fov, cameraZ, edgeMarginScale) {
  if (!items.length) return 1;

  const width = Math.max(1, root.clientWidth || window.innerWidth);
  const height = Math.max(1, root.clientHeight || window.innerHeight);
  const aspect = width / height;
  const visibleWorldWidth =
    2 * Math.tan((fov * Math.PI) / 360) * cameraZ * aspect;
  const viewportEdge = visibleWorldWidth / 2;

  const widths = items.map((item) => {
    const media = item.querySelector(mediaSelector);
    return planeHeight * clamp(getMediaAspect(media), 0.45, 2.4);
  });
  const largestWidth = Math.max(...widths);
  const edgeMargin = largestWidth * edgeMarginScale;

  let cursor = -viewportEdge - edgeMargin;
  const starts = widths.map((itemWidth) => {
    const startX = cursor - itemWidth / 2;
    cursor -= itemWidth + gap;
    return startX;
  });

  const lastIndex = widths.length - 1;
  const lastStartX = starts[lastIndex];
  const lastWidth = widths[lastIndex];
  const travelDistance =
    viewportEdge + edgeMargin + lastWidth / 2 - lastStartX;

  if (!Number.isFinite(travelDistance) || travelDistance <= 0) return 1;
  return clamp(-lastStartX / travelDistance, 0, 1);
}

export const brandaWorksServicesTransition = {
  name: "branda-works-services-transition",
  category: "composition",
  selector: '[data-motion~="branda-works-services-transition"]',

  mount(root, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    const worksSection = root.closest(WORKS_SECTION_SELECTOR);
    if (!worksSection) return;

    const target = resolveTarget(root, worksSection);
    if (!target) {
      console.warn("[MotionKit branda-works-services-transition] Services target not found.");
      return;
    }

    ensureStyles(root.ownerDocument);

    const itemSelector = readString(root, "motion-item-selector", DEFAULTS.itemSelector);
    const mediaSelector = readString(root, "motion-media-selector", DEFAULTS.mediaSelector);
    const planeHeight = Math.max(0.5, readNumber(root, "motion-plane-height", DEFAULTS.planeHeight));
    const gap = Math.max(0, readNumber(root, "motion-gap", DEFAULTS.gap));
    const fov = clamp(readNumber(root, "motion-fov", DEFAULTS.fov), 25, 120);
    const desktopCameraZ = Math.max(1, readNumber(root, "motion-camera-z", DEFAULTS.cameraZ));
    const mobileCameraZ = Math.max(
      1,
      readNumber(root, "motion-camera-z-mobile", DEFAULTS.mobileCameraZ)
    );
    const edgeMarginScale = Math.max(
      0,
      readNumber(root, "motion-edge-margin", DEFAULTS.edgeMargin)
    );
    const settleProgress = clamp(
      readNumber(root, "motion-settle-progress", DEFAULTS.settleProgress),
      0.8,
      1
    );
    const scaleFrom = clamp(
      readNumber(root, "motion-services-scale-from", DEFAULTS.scaleFrom),
      0.2,
      1
    );
    const radiusFrom = Math.max(
      0,
      readNumber(root, "motion-services-radius-from", DEFAULTS.radiusFrom)
    );
    const fadePortion = clamp(
      readNumber(root, "motion-services-fade-portion", DEFAULTS.fadePortion),
      0.01,
      1
    );

    const items = Array.from(root.querySelectorAll(itemSelector));
    if (!items.length) return;

    const preview = createPreview(root, target);
    gsap.set(preview, {
      scale: scaleFrom,
      autoAlpha: 0,
      borderRadius: `${radiusFrom}px`
    });

    let worksTrigger = null;
    let revealStart = 1;
    let rafId = null;
    let destroyed = false;

    const cameraZ = () => (window.innerWidth <= 767 ? mobileCameraZ : desktopCameraZ);

    const recalculate = () => {
      revealStart = getCenterCrossProgress(
        root,
        items,
        mediaSelector,
        planeHeight,
        gap,
        fov,
        cameraZ(),
        edgeMarginScale
      );
    };

    const updatePreview = () => {
      if (destroyed) return;

      worksTrigger = worksTrigger || ScrollTrigger.getById(WORKS_TRIGGER_ID);
      if (!worksTrigger) {
        rafId = requestAnimationFrame(updatePreview);
        return;
      }

      const spatialProgress = clamp(worksTrigger.progress / settleProgress, 0, 1);
      const revealProgress = clamp(
        (spatialProgress - revealStart) / Math.max(0.0001, 1 - revealStart),
        0,
        1
      );
      const eased = 1 - Math.pow(1 - revealProgress, 2);
      const scale = scaleFrom + (1 - scaleFrom) * eased;
      const radius = radiusFrom * (1 - eased);
      const opacity = clamp(revealProgress / fadePortion, 0, 1);

      gsap.set(preview, {
        scale,
        autoAlpha: opacity,
        borderRadius: `${radius}px`
      });

      rafId = requestAnimationFrame(updatePreview);
    };

    recalculate();
    window.addEventListener("resize", recalculate, { passive: true });
    rafId = requestAnimationFrame(updatePreview);

    return () => {
      destroyed = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", recalculate);
      gsap.killTweensOf(preview);
      preview.remove();
    };
  }
};
