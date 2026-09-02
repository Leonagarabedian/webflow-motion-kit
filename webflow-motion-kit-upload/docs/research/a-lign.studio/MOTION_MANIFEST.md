# a-lign studio — implementation motion manifest

Scope: homepage process sequence, sampled 2026-09-02 at 1440 × 900.

## Signature interaction: pinned three-phase process

- `.process_wrap`: `4500 → 7200px`, section height `3600px`. **Observed**
- Dense sample count: 21 at `0, .05 … 1`. **Observed**
- Initial card top positions: Strategy `281px`, Design `328.9px`, Build `376.9px`. **Observed**
- Active z-index windows: Strategy approximately `.05–.30`; Design `.35–.65`; Build `.70–1`. **Observed**
- When a phase leaves, its card/image moves above the viewport while the next stacked card becomes active. Strategy settles at y `-94.8px`; Design later settles at `-46.8px`; Build remains at `375.9px` through the sampled end. **Observed**

| p | active phase | card y positions |
|---:|---|---|
| 0.00 | none/entry | `281, 328.9, 376.9` |
| 0.05 | Strategy | `280, 327.9, 375.9` |
| 0.30 | Strategy | `280, 327.9, 375.9` |
| 0.35 | Design | `-94.8, 327.9, 375.9` |
| 0.65 | Design | `-94.8, 327.9, 375.9` |
| 0.70 | Build | `-94.8, -46.8, 375.9` |
| 1.00 | Build | `-94.8, -46.8, 375.9` |

## Related image-sequence system

Three canvases remain present in the values/about region at all sampled widths. The public script explicitly preloads and draws timeline frames, with resize and teardown handlers. **Source-extracted + observed**

## Responsive branch

- At 768 × 1024 and 390 × 844, process phase boxes render as compact `32px`-high rows rather than absolute pinned cards. **Observed**
- The process section becomes normal-flow content (`1619.77px` measured tablet; `3235.23px` measured mobile after layout settled). **Observed**
- Implementation rule: desktop gets pinned milestone choreography; tablet/mobile get accessible expandable rows. **Inferred from observed structure + source lifecycle**

## Module boundary

Use `pinned-process` for desktop and `process-accordion` for compact widths, sharing the same content model. Keep the canvas frame sequence as a separate `image-sequence` module with explicit preload, resize and cleanup.
