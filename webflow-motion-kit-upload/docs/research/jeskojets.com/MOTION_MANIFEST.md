# Jesko Jets — implementation motion manifest

Scope: homepage hero, aircraft handoff and benefits accordion, sampled 2026-09-02 at 1440 × 900.

## Signature interaction: hero zoom-apart

- `.hero_scroll-area`: `0 → 1800px` active distance within a `2700px` section. **Observed**
- Dense sample count: 21 at `0, .05 … 1`. **Observed**
- Background rendered width grows linearly from `1851.41px` to `12034.15px`. **Observed**
- Left/right headings translate linearly from `0` to `-720px/+720px`. **Observed**
- Sticky content remains locked to the viewport for the full interval. **Observed**

| p | background width | left x | right x |
|---:|---:|---:|---:|
| 0.00 | 1851.41 | 0 | 0 |
| 0.25 | 4397.09 | -180 | 180 |
| 0.50 | 6942.78 | -360 | 360 |
| 0.75 | 9488.47 | -540 | 540 |
| 1.00 | 12034.15 | -720 | 720 |

## Signature interaction: jet-to-blueprint handoff

- `.jet_scroll-area`: `3600 → 6300px` active distance within a `3600px` section. **Observed**
- Jet holds scale `1` through about progress `.20`, eases down, reaches scale `.4` around `.85`, then holds. **Observed**
- Blueprint remains above the viewport through `.50`, enters between `.55–.80`, and settles at y `95.98px`. **Observed**
- Representative curve: scale `1` at `.20`, `.9524` at `.50`, `.7022` at `.70`, `.4014` at `.80`, `.4` at `.85–1`. **Observed**
- The aircraft image uses a CSS mask; the pinned composition hands visual priority to specifications/blueprint as the scale settles. **Source-extracted + observed**

## Signature interaction: synchronized benefits accordion

- Open card height `311.54px`; description height `263.55px`. After selecting another item, the sampled card collapses to `47.99px` and description height `0`. **Observed**
- Media panels are absolutely stacked and synchronized to the active accordion item. **Observed + source-extracted**

## Responsive branch

- Desktop hero section is `2700px`; tablet is `2048px`; mobile is `1688px`—two viewport heights of travel plus one sticky viewport. **Observed**
- `.blueprint.b-desktop` is hidden and `.blueprint.b-mobile` enabled below desktop. **Observed**
- Globe/desktop-heavy branches are replaced with smaller-screen structures. **Source-extracted + observed**

## Module boundary

Split into `zoom-apart-hero`, `masked-media-handoff`, and `accordion-media`. Only the first and third are near-term reusable modules; aircraft composition remains a site recipe.
