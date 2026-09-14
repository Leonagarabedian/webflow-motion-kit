/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";

import {
  SCROLL_GEOMETRY_STRATEGIES,
  buildDynamicSpanTrigger,
  createCrossingLineTriggers,
  crossingLinePosition,
  crossingLineProgress,
  findNearestCrossingIndex,
  measuredTravelDistance,
  syncedProgress
} from "../src/core/scroll-alignment/specialized-geometry.js";

function rect({ top = 0, left = 0, width = 100, height = 100 } = {}) {
  return {
    top,
    bottom: top + height,
    left,
    right: left + width,
    width,
    height,
    x: left,
    y: top,
    toJSON() { return this; }
  };
}

describe("specialized scroll geometry", () => {
  it("keeps the gallery crossing-line contract exact", () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
    const trigger = document.createElement("div");
    trigger.getBoundingClientRect = () => rect({ top: 400, height: 200 });

    expect(crossingLinePosition(50)).toBe(500);
    expect(crossingLineProgress(trigger, 50)).toBeCloseTo(0.5);
  });

  it("creates one top/bottom crossing trigger per item", () => {
    const created = [];
    const ScrollTrigger = {
      create: vi.fn((config) => {
        created.push(config);
        return { kill: vi.fn() };
      })
    };
    const triggers = [document.createElement("div"), document.createElement("div")];

    createCrossingLineTriggers({ ScrollTrigger, triggers, activation: 50 });

    expect(created).toHaveLength(2);
    expect(created[0].start).toBe("top 50%");
    expect(created[0].end).toBe("bottom 50%");
    expect(created[1].start).toBe("top 50%");
    expect(created[1].end).toBe("bottom 50%");
  });

  it("finds the item intersecting the activation line before nearest fallbacks", () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
    const first = document.createElement("div");
    const second = document.createElement("div");
    first.getBoundingClientRect = () => rect({ top: 100, height: 200 });
    second.getBoundingClientRect = () => rect({ top: 450, height: 200 });

    expect(findNearestCrossingIndex([first, second], 50)).toBe(1);
  });

  it("maps shared trigger progress into a local progress window", () => {
    expect(syncedProgress(0.2, 0.2, 0.6)).toBe(0);
    expect(syncedProgress(0.4, 0.2, 0.6)).toBeCloseTo(0.5);
    expect(syncedProgress(0.8, 0.2, 0.6)).toBe(1);
  });

  it("preserves measured travel distance on both axes", () => {
    const container = document.createElement("section");
    const element = document.createElement("div");
    container.getBoundingClientRect = () => rect({ top: 0, left: 0, width: 1000, height: 900 });
    element.getBoundingClientRect = () => rect({ top: 100, left: 200, width: 200, height: 100 });

    expect(measuredTravelDistance({
      element,
      container,
      axis: "x",
      bottomOffset: 20,
      getStyles: () => ({ paddingBottom: "0px" })
    })).toBe(580);

    expect(measuredTravelDistance({
      element,
      container,
      axis: "y",
      bottomOffset: 20,
      getStyles: () => ({ paddingBottom: "40px" })
    })).toBe(640);
  });

  it("preserves explicit measured-travel overrides", () => {
    const element = document.createElement("div");
    const container = document.createElement("section");
    expect(measuredTravelDistance({
      element,
      container,
      explicitDistance: "240",
      direction: -1
    })).toBe(-240);
  });

  it("builds refresh-safe dynamic span configs without changing semantic starts or ends", () => {
    const trigger = document.createElement("section");
    const endTrigger = document.createElement("div");
    const config = buildDynamicSpanTrigger({
      id: "dynamic-test",
      trigger,
      start: "top top",
      end: "+=900",
      endTrigger,
      scrub: 1,
      pin: false
    });

    expect(config).toMatchObject({
      id: "dynamic-test",
      trigger,
      start: "top top",
      end: "+=900",
      endTrigger,
      scrub: 1,
      pin: false,
      invalidateOnRefresh: true
    });
  });

  it("publishes named strategies for future modules", () => {
    expect(SCROLL_GEOMETRY_STRATEGIES).toMatchObject({
      AUTO: "auto",
      CROSSING_LINE: "crossing-line",
      SYNCED_PROGRESS: "synced-progress",
      MEASURED_TRAVEL: "measured-travel",
      DYNAMIC_SPAN: "dynamic-span",
      PINNED_AUTO: "pinned-auto",
      NON_SCROLL: "non-scroll"
    });
  });
});
