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

const MEDIUM_AUTO = new Set([
  "scroll-highlight",
  "parallax",
  "pinned-media",
  "pinned-steps",
  "character-converge"
]);

const SPECIALIZED_READY = new Map([
  ["scroll-synced-gallery", "crossing-line"],
  ["element-blur-reveal", "synced-progress"],
  ["scroll-travel", "measured-travel"],
  ["liquid-fill", "dynamic-span"],
  ["synced-fade", "synced-progress"],
  ["element-layout-return", "synced-progress"],
  ["depth-emerge", "synced-progress"]
]);

const CUSTOM_READY = new Map([
  ["hero-heart-transition", "custom-pinned-span"],
  ["hero-frame-transition", "custom-pinned-span"],
  ["hero-slit-transition", "custom-pinned-span"],
  ["branda-spatial-works", "custom-spatial-span"],
  ["branda-spatial-pin-layout", "custom-spatial-layout"],
  ["branda-spatial-shell", "custom-spatial-layout"],
  ["character-scatter-title", "velocity-timeline"],
  ["spatial-loop", "custom-spatial-loop"],
  ["section-handoff", "custom-handoff"],
  ["pin-overlap-next", "custom-handoff"]
]);

const COMPLEX_REVIEW = new Set([
  "stacked-cards",
  "stacked-image-hover",
  "character-scatter-title-legacy",
  "morph-narrative"
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
  "hover-highlight-box",
  "hover-background-swap",
  "hover-linked-illuminate",
  "accordion-media",
  "works-services-transition",
  "grid-video-reveal",
  "brand-load",
  "paired-tag-intro",
  "nav-flip",
  "theme-switch"
]);

function motionNames(element) {
  return (element.getAttribute("data-motion") || "")
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function classify(name) {
  if (SAFE_AUTO.has(name)) return { status: "safe-auto", strategy: "auto" };
  if (MEDIUM_AUTO.has(name)) return { status: "medium-auto", strategy: "auto" };
  if (SPECIALIZED_READY.has(name)) return { status: "specialized-ready", strategy: SPECIALIZED_READY.get(name) };
  if (CUSTOM_READY.has(name)) return { status: "custom-ready", strategy: CUSTOM_READY.get(name) };
  if (COMPLEX_REVIEW.has(name)) return { status: "complex-review", strategy: "review" };
  if (NON_SCROLL.has(name)) return { status: "non-scroll", strategy: "non-scroll" };
  return { status: "unclassified", strategy: "unclassified" };
}

export function auditScrollAlignment(root = document) {
  const elements = Array.from(root.querySelectorAll("[data-motion]"));
  const entries = [];

  elements.forEach((element, elementIndex) => {
    motionNames(element).forEach((name) => {
      const { status, strategy } = classify(name);
      const alignment = element.getAttribute("data-motion-alignment") || "legacy";
      const minWidth = element.getAttribute("data-motion-min-width");
      const trigger = element.getAttribute("data-motion-trigger");

      entries.push({
        elementIndex,
        name,
        status,
        strategy,
        alignment,
        minWidth: minWidth == null ? null : Number(minWidth),
        trigger: trigger || null,
        id: element.id || null,
        classes: element.className || null,
        reason:
          status === "safe-auto" ? "standard viewport-owned trigger" :
          status === "medium-auto" ? "shared planner supported; enable after page-level visual review" :
          status === "specialized-ready" ? `shared ${strategy} geometry preserves the module's specialized scroll contract` :
          status === "custom-ready" ? `module intentionally owns a ${strategy} contract instead of generic auto alignment` :
          status === "complex-review" ? "complex module still requires an explicit geometry contract before reuse" :
          status === "non-scroll" ? "interaction, velocity, layout, load, or input-driven behavior is outside viewport alignment" :
          "not yet classified for the motion system"
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
    mediumToReview: entries.filter((entry) => entry.status === "medium-auto" && entry.alignment !== "auto"),
    specializedReady: entries.filter((entry) => entry.status === "specialized-ready"),
    customReady: entries.filter((entry) => entry.status === "custom-ready"),
    protected: entries.filter((entry) => entry.status === "complex-review"),
    unclassified: entries.filter((entry) => entry.status === "unclassified")
  };
}

export const migrationAuditPolicy = Object.freeze({
  safeAuto: [...SAFE_AUTO],
  mediumAuto: [...MEDIUM_AUTO],
  specializedReady: Object.fromEntries(SPECIALIZED_READY),
  customReady: Object.fromEntries(CUSTOM_READY),
  complexReview: [...COMPLEX_REVIEW],
  nonScroll: [...NON_SCROLL]
});
