import { getActiveBreakpoint, resolveBreakpointConfig } from "./breakpoints.js";
import { createAlignmentDiagnostics } from "./diagnostics.js";
import {
  computeAlignedStart,
  getViewportMetrics,
  measureElement
} from "./geometry.js";
import {
  normalizePinConfig,
  resolvePinTarget,
  warnOnNestedPin
} from "./pin.js";
import { planScrollAlignment } from "./planner.js";
import { analyzeMotion } from "./analyze-motion.js";
import { createAlignmentRefreshController } from "./refresh.js";
import { computeAlignedEnd, resolveSpan } from "./span.js";
import { createAlignedTimeline } from "./timeline.js";
import { buildLegacyTriggerConfig, resolveAlignmentTrigger } from "./trigger.js";
import {
  SCROLL_GEOMETRY_STRATEGIES,
  buildDynamicSpanTrigger,
  createCrossingLineTriggers,
  crossingLinePosition,
  crossingLineProgress,
  findNearestCrossingIndex,
  measuredTravelDistance,
  syncedProgress
} from "./specialized-geometry.js";

export const SCROLL_ALIGNMENT_VERSION = "1.2.0";
export const SCROLL_ALIGNMENT_MODES = Object.freeze({
  LEGACY: "legacy",
  ALIGNED: "aligned",
  AUTO: "auto"
});

function makeGeometryContext(trigger, win = window) {
  const viewport = getViewportMetrics(win);
  const element = measureElement(trigger, win);
  return {
    element,
    viewportHeight: viewport.height,
    viewportWidth: viewport.width,
    scrollY: viewport.scrollY
  };
}

export function createScrollAlignment({
  gsap,
  ScrollTrigger,
  getScroller = () => null,
  logger = console
} = {}) {
  const diagnostics = createAlignmentDiagnostics({ logger });
  const refresh = createAlignmentRefreshController({ ScrollTrigger, logger });

  function build(root, input = {}) {
    const mode = input.mode || SCROLL_ALIGNMENT_MODES.ALIGNED;
    if (mode === SCROLL_ALIGNMENT_MODES.LEGACY) {
      const legacy = buildLegacyTriggerConfig(input.legacy || input);
      const scrollTrigger = {
        ...legacy,
        trigger: legacy.trigger || root
      };
      return {
        mode,
        enabled: true,
        breakpoint: null,
        trigger: scrollTrigger.trigger,
        scrollTrigger,
        timeline: (timelineConfig = {}) => createAlignedTimeline(gsap, scrollTrigger, timelineConfig)
      };
    }

    const resolved = resolveBreakpointConfig(input);
    const config = resolved.config;
    if (config.enabled === false) {
      return { mode, enabled: false, breakpoint: resolved.breakpoint, trigger: root, scrollTrigger: null, timeline: null };
    }

    const trigger = resolveAlignmentTrigger(root, config.trigger || "self");
    const pinConfig = normalizePinConfig(config.pin);
    const pin = resolvePinTarget(root, pinConfig);
    const id = config.id || null;

    const getPlan = () => {
      if (mode !== SCROLL_ALIGNMENT_MODES.AUTO) return null;
      const geometry = makeGeometryContext(trigger);
      return planScrollAlignment({
        profile: config.profile || "editorial",
        breakpoint: getActiveBreakpoint(),
        geometry,
        stages: config.stages || [],
        timeline: config.motionTimeline || null,
        pinned: Boolean(pin),
        emphasis: config.emphasis ?? 1,
        scrub: config.scrub !== false,
        overrides: {
          ...(typeof config.scrub === "number" ? { scrub: config.scrub } : {}),
          ...config.overrides
        }
      });
    };

    const start = () => {
      const plan = getPlan();
      return computeAlignedStart({
        trigger,
        anchor: plan?.anchor || config.anchor || "top",
        viewport: plan?.viewport ?? config.viewport ?? 0.7,
        offset: config.offset ?? 0,
        headerOffset: config.headerOffset ?? 0
      });
    };

    const end = () => {
      const startValue = start();
      const context = makeGeometryContext(trigger);
      const plan = getPlan();
      return computeAlignedEnd({
        start: startValue,
        span: plan?.span ?? config.span ?? "70vh",
        context
      });
    };

    const scrollTrigger = {
      id: id || undefined,
      trigger,
      start,
      end,
      scrub: mode === SCROLL_ALIGNMENT_MODES.AUTO
        ? (() => getPlan()?.scrub ?? config.scrub ?? 0.85)()
        : (config.scrub ?? 0.85),
      invalidateOnRefresh: config.invalidateOnRefresh !== false,
      markers: config.markers === true,
      pin: pin || false,
      pinSpacing: pin ? pinConfig.spacing : undefined,
      anticipatePin: pin ? pinConfig.anticipate : undefined,
      onRefresh(self) {
        const context = makeGeometryContext(trigger);
        const plan = getPlan();
        const activeScrub = plan?.scrub ?? config.scrub ?? 0.85;
        if (self?.vars && self.vars.scrub !== activeScrub) {
          self.vars.scrub = activeScrub;
          self.scrubDuration?.(activeScrub);
        }
        const activeBreakpoint = mode === SCROLL_ALIGNMENT_MODES.AUTO ? getActiveBreakpoint() : resolved.breakpoint;
        const activeSpan = plan?.span ?? config.span ?? "70vh";
        diagnostics.record(id || self?.vars?.id || "anonymous", {
          mode,
          breakpoint: activeBreakpoint,
          trigger,
          anchor: plan?.anchor || config.anchor || "top",
          viewport: plan?.viewport ?? config.viewport ?? 0.7,
          span: activeSpan,
          spanPx: plan?.spanPx ?? resolveSpan(activeSpan, context),
          scrub: activeScrub,
          pin: Boolean(pin),
          smoother: Boolean(getScroller?.()),
          planner: plan ? {
            profile: plan.profile,
            facts: plan.facts,
            reasoning: plan.reasoning
          } : null
        });
        config.onRefresh?.(self, plan);
      },
      onUpdate: config.onUpdate,
      onEnter: config.onEnter,
      onLeave: config.onLeave,
      onEnterBack: config.onEnterBack,
      onLeaveBack: config.onLeaveBack
    };

    warnOnNestedPin({ trigger, pin, ScrollTrigger, logger });

    return {
      mode,
      enabled: true,
      breakpoint: resolved.breakpoint,
      trigger,
      pin,
      scrollTrigger,
      measure: () => makeGeometryContext(trigger),
      plan: getPlan,
      timeline: (timelineConfig = {}) => createAlignedTimeline(gsap, scrollTrigger, timelineConfig),
      diagnostics: () => diagnostics.get(id || "anonymous")
    };
  }

  return {
    version: SCROLL_ALIGNMENT_VERSION,
    modes: SCROLL_ALIGNMENT_MODES,
    strategies: SCROLL_GEOMETRY_STRATEGIES,
    build,
    plan: planScrollAlignment,
    analyze: analyzeMotion,
    diagnostics,
    refresh,
    getScroller,
    specialized: {
      buildDynamicSpanTrigger,
      createCrossingLineTriggers,
      crossingLinePosition,
      crossingLineProgress,
      findNearestCrossingIndex,
      measuredTravelDistance,
      syncedProgress
    }
  };
}

export {
  analyzeMotion,
  planScrollAlignment,
  computeAlignedStart,
  resolveSpan,
  resolveAlignmentTrigger,
  createAlignedTimeline,
  SCROLL_GEOMETRY_STRATEGIES,
  buildDynamicSpanTrigger,
  createCrossingLineTriggers,
  crossingLinePosition,
  crossingLineProgress,
  findNearestCrossingIndex,
  measuredTravelDistance,
  syncedProgress
};

export { createPhaseScrollPlan } from "./phase-plan.js";
