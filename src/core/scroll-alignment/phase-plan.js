/**
 * Pure, reusable scroll allocation for authored progress in [0, 1].
 * Travel is pixels; minVh/maxVh are fractions of viewport height.
 * Overlapping phases share scroll using the largest required density.
 * A preserved prefix uses baselineDistance, so later pacing cannot stretch it.
 */
export function createPhaseScrollPlan(phases, {
  viewportHeight = 1,
  baselineDistance = viewportHeight,
  preserveUntil = 0,
  factor = 1,
  gapVh = 0.12
} = {}) {
  const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;
  const viewport = positive(viewportHeight, 1);
  const baseline = positive(baselineDistance, viewport);
  const scale = positive(factor, 1);
  const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const prefix = clamp(preserveUntil);
  const valid = phases.filter(p => Number.isFinite(p.start) && Number.isFinite(p.end) && p.start >= 0 && p.end <= 1 && p.end > p.start).map(p => {
    const minimum = Math.max(0, Number.isFinite(p.minVh) ? p.minVh : 0.12) * viewport;
    const maximum = Number.isFinite(p.maxVh) ? Math.max(minimum, p.maxVh * viewport) : Infinity;
    const travel = Number.isFinite(p.travel) ? Math.abs(p.travel) : 0;
    const distance = Math.max(1, Math.min(maximum, Math.max(minimum, travel)));
    return { ...p, density: distance / (p.end - p.start) };
  });
  const boundaries = [...new Set([0, prefix, 1, ...valid.flatMap(p => [p.start, p.end])])].sort((a, b) => a - b);
  let distance = 0;
  const knots = [{ authored: 0, distance: 0 }];
  for (let i = 1; i < boundaries.length; i++) {
    const from = boundaries[i - 1];
    const to = boundaries[i];
    const middle = (from + to) / 2;
    const active = valid.filter(p => middle >= p.start && middle < p.end);
    const density = to <= prefix ? baseline
      : active.length ? Math.max(...active.map(p => p.density))
      : positive(gapVh, 0.12) * viewport;
    distance += (to - from) * density * scale;
    knots.push({ authored: to, distance });
  }
  const totalDistance = distance;
  const interpolate = (value, input, output) => {
    for (let i = 1; i < knots.length; i++) {
      if (value <= knots[i][input]) {
        const a = knots[i - 1], b = knots[i];
        return a[output] + (b[output] - a[output]) * (value - a[input]) / (b[input] - a[input]);
      }
    }
    return knots.at(-1)[output];
  };
  return {
    totalDistance,
    knots,
    authoredProgressAt: scrollProgress => interpolate(clamp(scrollProgress) * totalDistance, "distance", "authored"),
    scrollProgressAt: authoredProgress => interpolate(clamp(authoredProgress), "authored", "distance") / totalDistance
  };
}
