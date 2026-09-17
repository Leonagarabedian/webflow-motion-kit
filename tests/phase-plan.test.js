import { describe, expect, it } from "vitest";
import { createPhaseScrollPlan } from "../src/core/scroll-alignment/phase-plan.js";

describe("reusable phase scroll allocation", () => {
  it("preserves opening pixels while shortening the ending and final pause", () => {
    const plan = createPhaseScrollPlan([
      { start: 0, end: 0.56, travel: 4000 },
      { start: 0.56, end: 0.63, travel: 70, minVh: 0.08, maxVh: 0.18 },
      { start: 0.63, end: 0.65, travel: 4, minVh: 0.04, maxVh: 0.08 },
      { start: 0.65, end: 0.72, travel: 0, minVh: 0.08 },
      { start: 0.72, end: 0.78, travel: 0, minVh: 0.06 }
    ], { viewportHeight: 1000, baselineDistance: 7000, preserveUntil: 0.56 });
    expect(plan.scrollProgressAt(0.56) * plan.totalDistance).toBeCloseTo(3920);
    expect(plan.scrollProgressAt(0.25) * plan.totalDistance).toBeCloseTo(1750);
    expect(plan.totalDistance - 3920).toBeCloseTo(286.4);
    expect(plan.totalDistance).toBeLessThan(7000);
    for (const value of [0, 0.1, 0.56, 0.6, 0.63, 0.65, 0.72, 0.78, 0.9, 1]) {
      expect(plan.authoredProgressAt(plan.scrollProgressAt(value))).toBeCloseTo(value);
    }
  });
  it("shares distance for overlapping phases rather than counting travel twice", () => {
    const plan = createPhaseScrollPlan([
      { start: 0, end: 1, travel: 1000 },
      { start: 0.25, end: 0.75, travel: 1000 }
    ], { viewportHeight: 1000 });
    expect(plan.totalDistance).toBe(1500);
  });
  it("recomputes from fresh viewport measurements and caps small effect travel", () => {
    const phases = [{ start: 0, end: 1, travel: 2000, minVh: 0.08, maxVh: 0.18 }];
    expect(createPhaseScrollPlan(phases, { viewportHeight: 1000 }).totalDistance).toBe(180);
    expect(createPhaseScrollPlan(phases, { viewportHeight: 500 }).totalDistance).toBe(90);
  });
  it("keeps mappings finite for invalid phases, gaps and out-of-range progress", () => {
    const plan = createPhaseScrollPlan([
      { start: 0.5, end: 0.5, travel: 100 },
      { start: NaN, end: 1, travel: 100 },
      { start: -1, end: 1, travel: 100 }
    ], { viewportHeight: 0 });
    expect(plan.totalDistance).toBeGreaterThan(0);
    expect(plan.authoredProgressAt(-1)).toBe(0);
    expect(plan.authoredProgressAt(2)).toBe(1);
    expect(plan.scrollProgressAt(NaN)).toBe(0);
  });
  it("applies an overall factor without changing phase mapping", () => {
    const phases = [{ start: 0.3, end: 0.8, travel: 500 }];
    const a = createPhaseScrollPlan(phases, { viewportHeight: 1000 });
    const b = createPhaseScrollPlan(phases, { viewportHeight: 1000, factor: 0.5 });
    expect(b.totalDistance).toBe(a.totalDistance * 0.5);
    expect(b.authoredProgressAt(0.6)).toBe(a.authoredProgressAt(0.6));
  });
});
