const SAFE_AUTO = new Set([
  "blur-reveal",
  "line-reveal",
  "text-reveal",
  "image-clip",
  "svg-reveal",
  "scramble-text",
  "brand-field-activate",
  "statement-compression"
]);

const SPECIAL_GEOMETRY = new Set([
  "scroll-synced-gallery",
  "element-blur-reveal",
  "scroll-travel",
  "liquid-fill",
  "synced-fade",
  "element-layout-return",
  "works-services-transition"
]);

const COMPLEX_REVIEW = new Set([
  "pinned-media",
  "pinned-steps",
  "stacked-cards",
  "stacked-image-hover",
  "accordion-media",
  "scroll-highlight",
  "hero-frame-transition",
  "hero-heart-transition",
  "branda-spatial-works",
  "branda-spatial-pin-layout",
  "depth-emerge",
  "character-scatter-title",
  "character-converge",
  "morph-narrative",
  "grid-video-reveal"
]);

const NON_SCROLL = new Set([
  "link-swap",
  "magnetic",
  "cursor",
  "responsive-menu",
  "view-switch",
  "page-transition",
  "loader-composition",
  "pinned-media-return",
  "hover-highlight-box"
]);

function motionNames(element) {
  return (element.getAttribute("data-motion") || "")
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function classify(name) {
  if (SAFE_AUTO.has(name)) return "safe-auto";
  if (SPECIAL_GEOMETRY.has(name)) return "special-geometry";
  if (COMPLEX_REVIEW.has(name)) return "complex-review";
  if (NON_SCROLL.has(name)) return "non-scroll";
  return "unclassified";
}

export function auditScrollAlignment(root = document) {
  const elements = Array.from(root.querySelectorAll("[data-motion]"));
  const entries = [];

  elements.forEach((element, elementIndex) => {
    motionNames(element).forEach((name) => {
      const status = classify(name);
      const alignment = element.getAttribute("data-motion-alignment") || "legacy";
      const minWidth = element.getAttribute("data-motion-min-width");
      const trigger = element.getAttribute("data-motion-trigger");

      entries.push({
        elementIndex,
        name,
        status,
        alignment,
        minWidth: minWidth == null ? null : Number(minWidth),
        trigger: trigger || null,
        id: element.id || null,
        classes: element.className || null,
        reason:
          status === "safe-auto" ? "standard viewport-owned trigger" :
          status === "special-geometry" ? "owns synchronized, measured, or shared scroll geometry" :
          status === "complex-review" ? "pinned, spatial, multi-stage, or shared transform ownership" :
          status === "non-scroll" ? "not controlled by viewport alignment or uses velocity/hover/input instead" :
          "not yet classified for automatic migration"
      });
    });
  });

  const byStatus = entries.reduce((acc, entry) => {
    acc[entry.status] = (acc[entry.status] || 0) + 1;
    return acc;
  }, {});

  return {
    total: entries.length,
    byStatus,
    entries,
    safeToEnable: entries.filter((entry) => entry.status === "safe-auto" && entry.alignment !== "auto"),
    protected: entries.filter((entry) => entry.status === "special-geometry" || entry.status === "complex-review")
  };
}

export const migrationAuditPolicy = Object.freeze({
  safeAuto: [...SAFE_AUTO],
  specialGeometry: [...SPECIAL_GEOMETRY],
  complexReview: [...COMPLEX_REVIEW],
  nonScroll: [...NON_SCROLL]
});
