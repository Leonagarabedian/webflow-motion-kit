# scroll-aircraft-handoff

A source-shaped scroll composition for an aircraft/media handoff: a long scroll area holds a sticky viewport, content panels move out, the aircraft scales and shifts upward, and the aircraft image mask collapses while a blueprint/technical layer reveals.

This is not a simple two-layer reveal. The layout owns the 4× viewport scroll area, sticky switcher, media sizing, and masks; the module wires the separate ScrollTrigger ranges that create the dynamic.

## Webflow setup

```html
<section
  data-motion="scroll-aircraft-handoff"
  data-motion-min-width="992"
  data-motion-markers="false"
>
  <div class="sticky-switcher">
    <div data-motion-target="background"></div>

    <div data-motion-target="content-panel">intro/spec content</div>
    <div data-motion-target="content-panel">second content panel</div>

    <div data-motion-target="aircraft">
      <img data-motion-target="aircraft-image" />
    </div>

    <img data-motion-target="blueprint" />
  </div>
</section>
```

## Required targets

| Target | Purpose |
| --- | --- |
| `background` | Background or light layer that fades in during the first half of the scroll area. |
| `content-panel` | One or more text/spec panels that move downward and out during the middle of the scroll area. |
| `aircraft` | The aircraft/media wrapper that scales down and shifts upward. |
| `aircraft-image` | The visible aircraft image layer whose mask collapses near the end. |
| `blueprint` | The technical/secondary image layer whose mask opens near the end. |

## Source-shaped default timing

| Part | Start → end | Default motion |
| --- | --- | --- |
| Background | `top top` → `center center` | opacity `0 → 1` |
| Content panels | `50% center` → `85% bottom` | yPercent `0 → 100`, scrub `1.2` |
| Aircraft wrapper | `25% center` → `85% bottom` | scale `1 → .4`, yPercent `0 → -15`, scrub `1.2` |
| Aircraft mask | `85% bottom` → `bottom bottom` | mask size `100% 150% → 100% 0%` |
| Blueprint mask | `85% bottom` → `bottom bottom` | mask size `100% 0% → 100% 150%`, mask y `200% → 50%` |

## Attributes

| Attribute | Default | Notes |
| --- | --- | --- |
| `data-motion-min-width` | `992` | Desktop breakpoint. |
| `data-motion-mobile` | `false` | Allows the effect below the desktop breakpoint. |
| `data-motion-trigger` | root | Optional trigger selector. |
| `data-motion-markers` | `false` | Shows ScrollTrigger markers. |
| `data-motion-background-start` | `top top` | Background fade start. |
| `data-motion-background-end` | `center center` | Background fade end. |
| `data-motion-content-start` | `50% center` | Content panel movement start. |
| `data-motion-content-end` | `85% bottom` | Content panel movement end. |
| `data-motion-aircraft-start` | `25% center` | Aircraft movement start. |
| `data-motion-aircraft-end` | `85% bottom` | Aircraft movement end. |
| `data-motion-mask-start` | `85% bottom` | Mask handoff start. |
| `data-motion-mask-end` | `bottom bottom` | Mask handoff end. |
| `data-motion-content-scrub` | `1.2` | Content movement scrub. |
| `data-motion-aircraft-scrub` | `1.2` | Aircraft movement scrub. |
| `data-motion-mask-scrub` | `true` | Mask handoff scrub. |
| `data-motion-aircraft-scale-to` | `.4` | End scale for the aircraft wrapper. |
| `data-motion-aircraft-y-to` | `-15` | End yPercent for the aircraft wrapper. |

## CSS requirements

- Root scroll area should be about `400vh` high.
- Sticky switcher should be `position: sticky; top: 0; height: 100vh; overflow: hidden;`.
- Aircraft should be positioned in the sticky viewport, not in normal document flow.
- `aircraft-image` and `blueprint` must have compatible mask CSS using `--motion-mask-size` and `--motion-mask-y`.
- The module only animates motion values; it does not create layout, masks, or imagery.
