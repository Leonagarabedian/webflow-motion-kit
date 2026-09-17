# Per-phase auto scroll pacing

Import `createPhaseScrollPlan` from the scroll-alignment entry point.

Each phase provides authored `start`/`end` progress (0..1), measured pixel `travel`, and optional `minVh`/`maxVh` (fractions of viewport height, e.g. 0.08 = 8vh). The calculator allocates pixel distances and supplies reversible piecewise progress mapping. Overlaps share the largest required scroll density, without double-counting concurrent phases. Uncovered gaps use `gapVh` density. Invalid phase intervals are ignored.

Use `totalDistance` for the ScrollTrigger range and feed `authoredProgressAt(self.progress)` into the existing renderer. `scrollProgressAt(authoredProgress)` maps in the other direction. Recreate the plan from fresh dimensions when ScrollTrigger refreshes. `factor` scales the whole allocation. `baselineDistance` and `preserveUntil` preserve a previously approved prefix in scroll pixels.

This is a geometry and pacing policy, not detection of visual preference. Each module owns its measurements and limits.

## Heart hero

Only `data-motion-alignment="auto"` uses per-phase mapping. Legacy/manual/aligned retain the original range and direct progress renderer. The opening retains the previous auto pacing up to heart formation. Heart morph uses 8–18vh, settling 4–8vh, outline 8vh, disappearance 6vh; the final static tail uses a short gap density. Existing authored phase positions, colors, copy interpolation, pinning, scrub and rendering equations remain intact. `data-motion-scroll-factor` still scales the whole sequence.

The manual 235vh attribute may stay on the Webflow element as its saved legacy setting. Change alignment to `legacy` to restore it. Other modules are not migrated to this calculator by importing it.
