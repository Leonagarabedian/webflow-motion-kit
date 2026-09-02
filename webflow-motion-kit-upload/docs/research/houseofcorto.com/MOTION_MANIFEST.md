# House of Corto — implementation motion manifest

Scope: homepage product world and layered tile hover, sampled 2026-09-02.

## Signature interaction: transform-driven product world

- The document remains `900px` tall and `scrollY` remains `0`; `body` overflow is hidden. **Observed**
- A generated `.container` (`3455.94 × 2483.95px` desktop) moves within a viewport-sized clipping section. Wheel input updates x/y transform with inertia. **Observed**
- Mixed wheel samples produced transforms `(-1728,-1242)`, `(-881.72,-1146.23)`, `(-382.18,-1169.53)`, `(-1179.16,-1233.28)`, `(-692.51,-17.83)`. **Observed; input-path dependent**
- Generated grid tiles repeat beyond the viewport, indicating a wrapped/infinite world rather than a bounded document grid. **Observed + source-extracted**
- Five desktop evidence frames are in `screenshots/grid-00.png … grid-04.png`. **Observed**

## Signature interaction: four-layer image hover

- Rest: four absolute images overlap at scale `1`. **Observed**
- Hover settled sample: layer scales approximately `[1, .3064, .1236, .0224]`, all centered on the same tile. **Observed**
- The public bundle restores the layers on leave and coordinates the hover with the product title/cursor state. **Source-extracted**

## Responsive branch

- Tablet grid container: `2687.97 × 2260.78px`; mobile: `2730 × 2268px`. The transform-world model remains active. **Observed**
- Mobile/tablet reveal the compact menu control; desktop navigation remains separate. **Observed**
- On mobile, one sampled wheel gesture changed the container transform from `(-1365,-1134)` to `(-499.27,-998.54)`. **Observed**

## Module boundary

Use `infinite-grid-viewport` for wheel/touch world motion and `stacked-image-hover` for the tile effect. The viewport engine must own bounds/wrapping, inertia, resize and pointer/touch normalization.
