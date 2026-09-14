export function createAlignedTimeline(gsap, scrollTriggerConfig, timelineConfig = {}) {
  return gsap.timeline({
    ...timelineConfig,
    scrollTrigger: {
      ...(timelineConfig.scrollTrigger || {}),
      ...scrollTriggerConfig
    }
  });
}

export function normalizeProgressWindow(start = 0, end = 1) {
  const from = Math.max(0, Math.min(1, Number(start) || 0));
  const to = Math.max(from + 0.0001, Math.min(1, Number(end) || 1));
  return { start: from, end: to };
}

export function progressToLocal(globalProgress, windowStart = 0, windowEnd = 1) {
  const range = normalizeProgressWindow(windowStart, windowEnd);
  return Math.max(0, Math.min(1, (globalProgress - range.start) / (range.end - range.start)));
}
