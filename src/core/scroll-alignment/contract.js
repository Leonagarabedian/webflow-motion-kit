import { computeAlignedStart } from "./geometry.js";
import { readNumber, readString } from "../config.js";

/** Existing defaults remain legacy. Auto selects a module-owned geometry recipe. */
export function scrollMode(root) {
  const mode = readString(root, "motion-alignment", readString(root, "motion-align", "legacy"));
  return mode === "auto" || mode === "aligned" ? mode : "legacy";
}

/**
 * Changes only the scroll contract. Animation, callbacks, pinning, and phase
 * progress stay in the module. Never run the auto recipe in legacy mode.
 */
export function resolveScrollContract(root, legacy, auto) {
  const mode = scrollMode(root);
  if (mode !== "auto") {
    const start = readString(root, "motion-start", null);
    const end = readString(root, "motion-end", null);
    const distance = readNumber(root, "motion-scroll-distance", 0);
    const vh = readNumber(root, "motion-scroll-vh", 0);
    const scrub = root.hasAttribute("data-motion-scrub") ? readNumber(root, "motion-scrub", legacy.scrub) : legacy.scrub;
    if (start == null && end == null && !distance && !vh && scrub === legacy.scrub) return legacy;
    return {
      ...legacy,
      ...(start == null ? {} : { start }),
      ...(end != null ? { end } : distance > 0 ? { end: () => "+=" + distance } : vh > 0 ? { end: () => "+=" + window.innerHeight * vh / 100 } : {}),
      ...(scrub === undefined ? {} : { scrub })
    };
  }
  if (!auto) throw new Error("[MotionKit] Auto geometry is required for this scroll owner.");
  const geometry = auto();
  return {
    ...legacy,
    ...geometry,
    invalidateOnRefresh: true,
    // Authored smoothing is independent of automatic range calculation.
    ...(root.hasAttribute("data-motion-scrub") ? { scrub: readNumber(root, "motion-scrub", legacy.scrub) } : {})
  };
}

export function layoutSize(element) {
  return {
    width: Math.max(0, element?.offsetWidth || element?.getBoundingClientRect?.().width || 0),
    height: Math.max(0, element?.offsetHeight || element?.getBoundingClientRect?.().height || 0)
  };
}

export function measuredRunway(element) {
  return Math.max(1, layoutSize(element).height - window.innerHeight);
}

/**
 * Phase-aware pacing for bespoke pinned sequences. This is a geometry/pacing
 * heuristic, not a replacement for the authored progress mapping.
 * Each phase receives at least 12% of a viewport or its measured travel.
 */
export function phaseScrollDistance(root, phases) {
  const viewport = Math.max(1, window.innerHeight);
  const required = phases.reduce((max, phase) => {
    const fraction = Number(phase.end) - Number(phase.start);
    if (!Number.isFinite(fraction) || fraction <= 0) return max;
    return Math.max(max, Math.max(viewport * 0.12, Math.abs(Number(phase.travel) || 0)) / fraction);
  }, viewport);
  const factor = Math.max(0.1, readNumber(root, "motion-scroll-factor", 1));
  return Math.max(viewport, required) * factor;
}

export function relativeSpan(distance) {
  return "+=" + Math.max(1, Number(distance) || 1);
}

export function viewportScroll(trigger, viewport, distance) {
  return {
    start: () => computeAlignedStart({ trigger, anchor: "top", viewport }),
    end: () => relativeSpan(distance())
  };
}
