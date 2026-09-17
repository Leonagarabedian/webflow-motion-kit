import { describe, expect, it } from "vitest";
import { architectureSpace } from "../src/modules/architecture-space.js";
import { counterExpansion } from "../src/modules/counter-expansion.js";
import { emphasisTransfer } from "../src/modules/emphasis-transfer.js";
import { glyphMaskReveal } from "../src/modules/glyph-mask-reveal.js";
import { innerLetterSpace } from "../src/modules/inner-letter-space.js";
import { materialShift } from "../src/modules/material-shift.js";
import { negativeSpaceCutout } from "../src/modules/negative-space-cutout.js";
import { occlusionBlocks } from "../src/modules/occlusion-blocks.js";
import { sectionSpace } from "../src/modules/section-space.js";
import { selectiveGlyphActivation } from "../src/modules/selective-glyph-activation.js";
import { sliceFragmentReveal } from "../src/modules/slice-fragment-reveal.js";
import { strokeFill } from "../src/modules/stroke-fill.js";
import { typographyGapSpace } from "../src/modules/typography-gap-space.js";
import { weightPressure } from "../src/modules/weight-pressure.js";

const expected = [
  innerLetterSpace,
  typographyGapSpace,
  sectionSpace,
  architectureSpace,
  strokeFill,
  weightPressure,
  glyphMaskReveal,
  counterExpansion,
  occlusionBlocks,
  emphasisTransfer,
  sliceFragmentReveal,
  negativeSpaceCutout,
  materialShift,
  selectiveGlyphActivation
];

describe("stationary typography modules", () => {
  it("exports all fourteen modules with stable data-motion selectors", () => {
    expect(expected).toHaveLength(14);
    for (const module of expected) {
      expect(module.category).toBe("typography");
      expect(module.selector).toBe(`[data-motion~="${module.name}"]`);
      expect(typeof module.mount).toBe("function");
    }
  });
});
