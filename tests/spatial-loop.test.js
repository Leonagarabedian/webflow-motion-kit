import { describe, expect, it } from "vitest";
import {
  nearestSpatialSnap,
  wrapSpatialPosition
} from "../src/modules/spatial-loop.js";

describe("spatial loop", () => {
  it("wraps slides continuously around half the total loop width", () => {
    expect(wrapSpatialPosition(0, 26, 25.05)).toEqual({
      x: -0.9499999999999993,
      originalPosition: 25.05
    });

    expect(wrapSpatialPosition(16.7, -9, 25.05)).toEqual({
      x: 0.6499999999999986,
      originalPosition: -8.350000000000001
    });
  });

  it("finds the nearest repeated slide anchor for snapping", () => {
    const stride = 8.35;
    const totalWidth = stride * 3;

    expect(nearestSpatialSnap(8, stride, totalWidth, 3)).toBeCloseTo(8.35, 5);
    expect(nearestSpatialSnap(24.7, stride, totalWidth, 3)).toBeCloseTo(25.05, 5);
    expect(nearestSpatialSnap(-0.4, stride, totalWidth, 3)).toBeCloseTo(0, 5);
  });
});
