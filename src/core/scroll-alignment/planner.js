import { analyzeMotion } from "./analyze-motion.js";

const PROFILE_DEFAULTS = Object.freeze({
  reveal: { viewport: 0.82, baseSpanVh: 0.34, scrub: 0.55 },
  editorial: { viewport: 0.76, baseSpanVh: 0.46, scrub: 0.7 },
  composition: { viewport: 0.72, baseSpanVh: 0.58, scrub: 0.85 },
  spatial: { viewport: 0.62, baseSpanVh: 0.95, scrub: 0.9 },
  handoff: { viewport: 0.68, baseSpanVh: 0.72, scrub: 0.85 }
});

const BREAKPOINT_FACTORS = Object.freeze({
  desktop: { span: 1, viewportShift: 0, scrub: 1 },
  tablet: { span: 0.86, viewportShift: 0.04, scrub: 0.9 },
  mobileLandscape: { span: 0.72, viewportShift: 0.07, scrub: 0.82 },
  mobile: { span: 0.62, viewportShift: 0.1, scrub: 0.76 }
});

function clamp(min, value, max) {
  return Math.max(min, Math.min(max, value));
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function geometryFactor({ elementHeight = 0, viewportHeight = 1 } = {}) {
  if (!viewportHeight) return 1;
  const ratio = elementHeight / viewportHeight;
  if (ratio < 0.12) return 0.92;
  if (ratio > 0.75) return 1.16;
  return 1 + (ratio - 0.35) * 0.16;
}

export function planScrollAlignment({
  profile = "editorial",
  breakpoint = "desktop",
  geometry = {},
  stages = [],
  timeline = null,
  pinned = false,
  emphasis = 1,
  scrub = true,
  overrides = {}
} = {}) {
  const facts = analyzeMotion({ profile, stages, timeline, pinned, scrub, emphasis });
  const defaults = PROFILE_DEFAULTS[profile] || PROFILE_DEFAULTS.editorial;
  const bp = BREAKPOINT_FACTORS[breakpoint] || BREAKPOINT_FACTORS.desktop;
  const viewportHeight = Math.max(1, finite(geometry.viewportHeight, 1));
  const elementHeight = Math.max(0, finite(geometry.element?.height ?? geometry.elementHeight, 0));

  const travelRatio = clamp(0, facts.maxTravel / viewportHeight, 1.5);
  const timingFactor = clamp(0.82, 0.9 + Math.min(facts.duration, 2.5) * 0.12, 1.2);
  const complexityFactor = clamp(0.78, 0.82 + facts.complexity * 0.2, 1.65);
  const movementFactor = 1 + travelRatio * 0.34;
  const sizeFactor = geometryFactor({ elementHeight, viewportHeight });
  const pinFactor = facts.pinned ? 1.28 : 1;

  const rawSpanPx = viewportHeight * defaults.baseSpanVh * bp.span * timingFactor * complexityFactor * movementFactor * sizeFactor * pinFactor;
  const minSpanPx = viewportHeight * (facts.pinned ? 0.65 : 0.3);
  const maxSpanPx = viewportHeight * (facts.pinned ? 2.6 : 1.8);
  const spanPx = clamp(minSpanPx, rawSpanPx, maxSpanPx);

  const tallElementShift = clamp(-0.05, ((elementHeight / viewportHeight) - 0.35) * -0.08, 0.035);
  const motionShift = clamp(-0.045, -(facts.complexity - 1) * 0.018, 0.025);
  const viewport = clamp(0.52, defaults.viewport + bp.viewportShift + tallElementShift + motionShift, 0.9);

  const plannedScrub = scrub === false
    ? false
    : clamp(0.2, defaults.scrub * bp.scrub * clamp(0.86, 0.9 + facts.complexity * 0.08, 1.12), 1.15);

  return {
    profile,
    breakpoint,
    anchor: overrides.anchor || "top",
    viewport: overrides.viewport ?? viewport,
    span: overrides.span ?? (() => spanPx),
    spanPx,
    scrub: overrides.scrub ?? plannedScrub,
    pin: overrides.pin ?? Boolean(pinned),
    facts,
    reasoning: {
      baseSpanVh: defaults.baseSpanVh,
      timingFactor,
      complexityFactor,
      movementFactor,
      sizeFactor,
      pinFactor,
      breakpointFactor: bp.span
    }
  };
}

export { PROFILE_DEFAULTS, BREAKPOINT_FACTORS };
