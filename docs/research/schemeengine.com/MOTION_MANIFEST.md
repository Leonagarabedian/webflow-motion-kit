# Scheme Engine — implementation motion manifest

Scope: homepage WebGL work browser, sampled 2026-09-02.

## Signature interaction: fixed WebGL work journey

- Desktop scroll range: `0 → 16425px`; canvas remains fixed at `1440 × 900`. **Observed**
- Tablet: `0 → 18688px`, canvas `768 × 1024`. Mobile: `0 → 10668px`, canvas `390 × 844`. **Observed**
- Evidence frames captured at normalized desktop progress `0, .25, .5, .75, 1` in `screenshots/`. **Observed**
- The persistent footer is visible at entry and hidden by `.5`. **Observed**
- Public bundle maps CMS work items into WebGL planes, applies inertial wheel/touch movement, snaps slide positions, swaps directional titles, promotes image textures to video near the viewport, filters categories by phasing meshes out/in, and zooms a clicked plane to the project route. **Source-extracted**
- DOM CMS items intentionally measure at zero dimensions; the canvas is the presentation layer. **Observed**

## Responsive branch

The canvas engine remains enabled at all three sampled widths. Geometry, travel distance and controls adapt; there is no static-list replacement. **Observed**

## Module boundary

Treat this as a separate `webgl-work-browser` package with its own render loop, texture lifecycle, gesture adapter and route-transition contract. Do not fold it into the GSAP primitive registry.

## Evidence frames

- `screenshots/desktop-000.png`
- `screenshots/desktop-025.png`
- `screenshots/desktop-050.png`
- `screenshots/desktop-075.png`
- `screenshots/desktop-100.png`
