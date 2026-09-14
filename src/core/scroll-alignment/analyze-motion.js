const PROFILE_WEIGHTS = Object.freeze({
  reveal: 0.75,
  editorial: 1,
  composition: 1.2,
  spatial: 1.55,
  handoff: 1.35
});

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function absDelta(a, b, fallback = 0) {
  const first = finite(a, fallback);
  const second = finite(b, fallback);
  return Math.abs(second - first);
}

function optionalDelta(from, to, fallbackFrom, fallbackTo) {
  const hasFrom = from !== undefined && from !== null;
  const hasTo = to !== undefined && to !== null;
  if (!hasFrom && !hasTo) return 0;
  return absDelta(hasFrom ? from : fallbackFrom, hasTo ? to : fallbackTo);
}

function normalizeStage(stage = {}) {
  const duration = Math.max(0, finite(stage.duration, 0));
  const start = Math.max(0, finite(stage.start, 0));
  const end = Math.max(start, finite(stage.end, start + duration));
  const travel = Math.hypot(
    optionalDelta(stage.xFrom ?? stage.x, stage.xTo, 0, 0),
    optionalDelta(stage.yFrom ?? stage.y, stage.yTo, 0, 0)
  );
  const scaleDelta = Math.max(
    optionalDelta(stage.scaleFrom ?? stage.scale, stage.scaleTo, 1, 1),
    optionalDelta(stage.scaleXFrom ?? stage.scaleX, stage.scaleXTo, 1, 1),
    optionalDelta(stage.scaleYFrom ?? stage.scaleY, stage.scaleYTo, 1, 1)
  );
  const blurDelta = optionalDelta(stage.blurFrom ?? stage.blur, stage.blurTo, 0, 0);
  const opacityDelta = optionalDelta(stage.opacityFrom ?? stage.opacity, stage.opacityTo, 1, 1);
  const rotationDelta = Math.max(
    optionalDelta(stage.rotationFrom ?? stage.rotation, stage.rotationTo, 0, 0),
    optionalDelta(stage.rotateFrom ?? stage.rotate, stage.rotateTo, 0, 0)
  );
  const trackingDelta = optionalDelta(stage.letterSpacingFrom ?? stage.letterSpacing, stage.letterSpacingTo, 0, 0);

  return {
    ...stage,
    start,
    end,
    duration: Math.max(duration, end - start),
    travel,
    scaleDelta,
    blurDelta,
    opacityDelta,
    rotationDelta,
    trackingDelta
  };
}

function timelineChildren(timeline) {
  if (!timeline?.getChildren) return [];
  try {
    return timeline.getChildren(true, true, true) || [];
  } catch {
    return [];
  }
}

function publicTimelineFacts(timeline) {
  if (!timeline) return { duration: 0, childCount: 0 };
  let duration = 0;
  try {
    duration = Math.max(0, finite(timeline.duration?.(), 0));
  } catch {
    duration = 0;
  }
  return { duration, childCount: timelineChildren(timeline).length };
}

/**
 * Produces stable, normalized facts for scroll planning.
 *
 * `stages` is the preferred source for transform magnitude because GSAP's public
 * API exposes timeline timing reliably but does not expose every from-value in
 * a portable way. Timeline timing is still inspected when a timeline is supplied.
 */
export function analyzeMotion({
  profile = "editorial",
  stages = [],
  timeline = null,
  pinned = false,
  scrub = true,
  emphasis = 1
} = {}) {
  const normalizedStages = stages.map(normalizeStage);
  const timelineFacts = publicTimelineFacts(timeline);
  const stageCount = Math.max(normalizedStages.length, timelineFacts.childCount || 0, 1);
  const explicitDuration = normalizedStages.reduce((max, stage) => Math.max(max, stage.end), 0);
  const duration = Math.max(explicitDuration, timelineFacts.duration, 0.0001);

  const occupiedDuration = normalizedStages.reduce((sum, stage) => sum + stage.duration, 0);
  const sequentiality = normalizedStages.length > 1
    ? Math.max(0, Math.min(1, duration ? occupiedDuration / (duration * normalizedStages.length) : 0))
    : 0;

  const maxTravel = normalizedStages.reduce((max, stage) => Math.max(max, stage.travel), 0);
  const maxScaleDelta = normalizedStages.reduce((max, stage) => Math.max(max, stage.scaleDelta), 0);
  const maxBlurDelta = normalizedStages.reduce((max, stage) => Math.max(max, stage.blurDelta), 0);
  const maxOpacityDelta = normalizedStages.reduce((max, stage) => Math.max(max, stage.opacityDelta), 0);
  const maxRotationDelta = normalizedStages.reduce((max, stage) => Math.max(max, stage.rotationDelta), 0);
  const maxTrackingDelta = normalizedStages.reduce((max, stage) => Math.max(max, stage.trackingDelta), 0);

  const profileWeight = PROFILE_WEIGHTS[profile] ?? PROFILE_WEIGHTS.editorial;
  const effectWeight =
    Math.min(1.5, maxScaleDelta * 1.5) +
    Math.min(1.25, maxBlurDelta / 12) +
    Math.min(0.75, maxOpacityDelta) +
    Math.min(1, maxRotationDelta / 90) +
    Math.min(0.5, maxTrackingDelta / 0.1);

  const complexity = Math.max(0.5,
    profileWeight *
    Math.max(0.5, finite(emphasis, 1)) *
    (1 + Math.max(0, stageCount - 1) * 0.16 + sequentiality * 0.18 + effectWeight * 0.12 + (pinned ? 0.35 : 0))
  );

  return {
    profile,
    profileWeight,
    stageCount,
    duration,
    sequentiality,
    maxTravel,
    maxScaleDelta,
    maxBlurDelta,
    maxOpacityDelta,
    maxRotationDelta,
    maxTrackingDelta,
    pinned: Boolean(pinned),
    scrub: Boolean(scrub),
    emphasis: Math.max(0.5, finite(emphasis, 1)),
    complexity,
    source: {
      stages: normalizedStages.length,
      timelineChildren: timelineFacts.childCount
    }
  };
}

export { PROFILE_WEIGHTS };
