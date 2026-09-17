import { scrollContracts } from "../../modules/scroll/contracts.js";
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
  ["pin-overlap-next", "custom-handoff"],
  ["media-room", "custom-depth-span"],
  ["tags-glitch", "custom-sticky-runway"],
  ["flip-relocation", "custom-flip-span"],
  ["stacked-cards", "native-sticky-layout"],
  ["services-center-shift", "measured-center-span"],
  ["footer-reveal", "measured-reveal-span"],
  ["theme-switch", "measured-theme-window"],
  ["morph-narrative", "measured-morph-span"],
  ["pinned-media-return", "measured-velocity-response"]
]);

const COMPLEX_REVIEW = new Set([
  "character-scatter-title-legacy",
]);

const NON_SCROLL = new Set([
  "link-swap",
  "magnetic",
  "cursor",
  "responsive-menu",
  "view-switch",
  "page-transition",
  "loader-composition",
  "hover-highlight-box",
  "hover-background-swap",
  "hover-linked-illuminate",
  "accordion-media",
  "works-services-transition",
  "grid-video-reveal",
  "brand-load",
  "paired-tag-intro",
  "nav-flip",
  "stacked-image-hover",
  "looping-labels"
]);

const MANUAL_SCROLL = new Set();

function motionNames(element) {
  return (element.getAttribute("data-motion") || "")
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function classify(name, element) {
  if (name === "scramble-text" && (element.getAttribute("data-motion-event") || "hover") !== "scroll") {
    return { status: "non-scroll", strategy: "non-scroll" };
  }
  if (MANUAL_SCROLL.has(name) || (name === "brand-load" && ["true", "1", ""].includes(element.getAttribute("data-motion-on-view")))) {
    return { status: "custom-ready", strategy: "measured-reveal-span" };
  }
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
      const { status, strategy } = classify(name, element);
      const selectedMode = element.getAttribute("data-motion-alignment") || element.getAttribute("data-motion-align") || "legacy";
      const alignment = selectedMode === "manual" ? "legacy" : selectedMode;
      const contract = scrollContracts.find(entry => entry.name === name);
      const syncAttribute = {
        "element-blur-reveal": "data-motion-element-blur-sync-trigger-id",
        "synced-fade": "data-motion-fade-sync-trigger-id",
        "pin-overlap-next": "data-motion-pin-overlap-sync-trigger-id",
        "depth-emerge": "data-motion-sync-trigger-id",
        "element-layout-return": "data-motion-layout-return-sync-trigger-id",
        "section-handoff": "data-motion-section-handoff-sync-trigger-id"
      }[name];
      const sync = syncAttribute ? element.getAttribute(syncAttribute) || null : null;
      const minWidth = element.getAttribute("data-motion-min-width");
      const trigger = element.getAttribute("data-motion-trigger");

      entries.push({
        elementIndex,
        name,
        status,
        strategy,
        alignment,
        ownership: sync ? "follower" : contract?.role || null,
        parentTriggerId: sync,
        autoControl: status === "non-scroll" ? null : sync ? "parent-owner" : contract?.role === "native-sticky" ? "browser-layout" : contract ? "module-geometry" : null,
        minWidth: minWidth == null ? null : Number(minWidth),
        trigger: trigger || null,
        id: element.id || null,
        classes: element.className || null,
        reason:
          status === "safe-auto" ? "standard viewport-owned trigger" :
          status === "medium-auto" ? "shared planner supported; enable after page-level visual review" :
          status === "specialized-ready" ? `shared ${strategy} geometry preserves the module's specialized scroll contract` :
          status === "custom-ready" ? `module intentionally owns a ${strategy} contract instead of generic auto alignment` :
          status === "manual-scroll" ? "module uses explicit viewport positions; shared auto planning is not implemented" :
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
    manualScroll: entries.filter((entry) => entry.status === "manual-scroll"),
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
  manualScroll: [...MANUAL_SCROLL],
  nonScroll: [...NON_SCROLL]
});
