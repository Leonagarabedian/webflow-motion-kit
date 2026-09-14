import { resolveBreakpointConfig } from "./breakpoints.js";
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
import { createAlignmentRefreshController } from "./refresh.js";
import { computeAlignedEnd, resolveSpan } from "./span.js";
import { createAlignedTimeline } from "./timeline.js";
import { buildLegacyTriggerConfig, resolveAlignmentTrigger } from "./trigger.js";

export const SCROLL_ALIGNMENT_VERSION = "1.0.0";
export const SCROLL_ALIGNMENT_MODES = Object.freeze({
  LEGACY: "legacy",
  ALIGNED: "aligned"
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
      return {
        mode,
        enabled: true,
        breakpoint: null,
        trigger: legacy.trigger || root,
        scrollTrigger: legacy,
        timeline: (timelineConfig = {}) => createAlignedTimeline(gsap, legacy, timelineConfig)
      };
    }

    const { breakpoint, config } = resolveBreakpointConfig(input);
    if (config.enabled === false) {
      return { mode, enabled: false, breakpoint, trigger: root, scrollTrigger: null, timeline: null };
    }

    const trigger = resolveAlignmentTrigger(root, config.trigger || "self");
    const pinConfig = normalizePinConfig(config.pin);
    const pin = resolvePinTarget(root, pinConfig);
    const id = config.id || null;

    const start = () => computeAlignedStart({
      trigger,
      anchor: config.anchor || "top",
      viewport: config.viewport ?? 0.7,
      offset: config.offset ?? 0,
      headerOffset: config.headerOffset ?? 0
    });

    const end = () => {
      const startValue = start();
      const context = makeGeometryContext(trigger);
      return computeAlignedEnd({
        start: startValue,
        span: config.span ?? "70vh",
        context
      });
    };

    const scrollTrigger = {
      id: id || undefined,
      trigger,
      start,
      end,
      scrub: config.scrub ?? 0.85,
      invalidateOnRefresh: config.invalidateOnRefresh !== false,
      markers: config.markers === true,
      pin: pin || false,
      pinSpacing: pin ? pinConfig.spacing : undefined,
      anticipatePin: pin ? pinConfig.anticipate : undefined,
      onRefresh(self) {
        const context = makeGeometryContext(trigger);
        diagnostics.record(id || self?.vars?.id || "anonymous", {
          mode,
          breakpoint,
          trigger,
          anchor: config.anchor || "top",
          viewport: config.viewport ?? 0.7,
          span: config.span ?? "70vh",
          spanPx: resolveSpan(config.span ?? "70vh", context),
          start: self?.start,
          end: self?.end,
          pin: Boolean(pin),
          smoother: Boolean(getScroller?.())
        });
        config.onRefresh?.(self);
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
      breakpoint,
      trigger,
      pin,
      scrollTrigger,
      measure: () => makeGeometryContext(trigger),
      timeline: (timelineConfig = {}) => createAlignedTimeline(gsap, scrollTrigger, timelineConfig),
      diagnostics: () => diagnostics.get(id || "anonymous")
    };
  }

  return {
    version: SCROLL_ALIGNMENT_VERSION,
    modes: SCROLL_ALIGNMENT_MODES,
    build,
    diagnostics,
    refresh,
    getScroller
  };
}

export {
  computeAlignedStart,
  resolveSpan,
  resolveAlignmentTrigger,
  createAlignedTimeline
};
