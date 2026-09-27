# scroll-aircraft-handoff

A source-shaped scroll composition for an aircraft/media handoff: a long scroll area holds a sticky viewport, content panels move out, the aircraft travels into position, and then the aircraft fades while a blueprint/technical image reveals.

This is not a simple two-layer reveal. The layout owns the 4× viewport scroll area, sticky switcher, media sizing, and masks; the module drives the effect with one sequenced ScrollTrigger timeline so the aircraft movement ends before the image handoff begins.

## Webflow setup

```html
<section
  data-motion="scroll-aircraft-handoff"
  data-motion-min-width="992"
  data-motion-coordinate-mode="source-stage"
  data-motion-markers="false"
>
  <div data-motion-target="background"></div>

  <div class="sticky-switcher">
    <div data-motion-target="content-panel">intro content</div>
    <div data-motion-target="content-panel">
      <div data-motion-target="blueprint-stage">
        <div data-motion-target="blueprint"></div>
      </div>
    </div>
  </div>

  <div data-motion-target="aircraft">
    <img data-motion-target="aircraft-image" />
  </div>
</section>
```

## Required targets

| Target | Purpose |
| --- | --- |
| `background` | Background or light layer that fades in during the first part of the scroll area. |
| `content-panel` | One or more text/spec panels that move downward through the middle of the scroll area. |
| `aircraft` | The aircraft/media wrapper that travels into its arrival state. |
| `aircraft-image` | The visible aircraft image layer that fades during the handoff. |
| `blueprint` | The technical/secondary image layer that fades/reveals during the handoff. |

## Optional source-coordinate target

| Target | Purpose |
| --- | --- |
| `blueprint-stage` | The authored reveal coordinate system. When `data-motion-coordinate-mode="source-stage"` is set, the aircraft travels toward this stage instead of using a fixed scale/yPercent approximation. If omitted, the blueprint parent is used. |

This is the preferred source-style setup: the blueprint stays in the spec/center panel, and the aircraft layer is transformed toward that authored stage. Do not move the blueprint into the aircraft wrapper unless the desired effect is a generic overlay, not the source logic.

## Source-shaped default timing

The effect is one scrubbed timeline from `data-motion-start` to `data-motion-end`.

| Part | Timeline position | Default motion |
| --- | --- | --- |
| Background | `0 → .28` | opacity `0 → 1` |
| Aircraft travel | `.18 → .72` | authored scale/yPercent, or calculated travel into `blueprint-stage` in source-stage mode |
| Content panels | `.28 → .72` | yPercent `0 → 100` |
| Handoff | `.78 → 1` | aircraft opacity `1 → 0`; blueprint opacity `0 → 1`, blueprint mask opens |

## Attributes

| Attribute | Default | Notes |
| --- | --- | --- |
| `data-motion-min-width` | `992` | Desktop breakpoint. |
| `data-motion-mobile` | `false` | Allows the effect below the desktop breakpoint. |
| `data-motion-trigger` | root | Optional trigger selector. |
| `data-motion-coordinate-mode` | `authored` | Use `source-stage` to calculate aircraft travel into the authored blueprint stage. |
| `data-motion-stage-scale` | `1` | Multiplier applied to the calculated source-stage fit scale. |
| `data-motion-stage-x-offset` | `0` | Pixel offset added to the calculated source-stage x travel. |
| `data-motion-stage-y-offset` | `0` | Pixel offset added to the calculated source-stage y travel. |
| `data-motion-markers` | `false` | Shows ScrollTrigger markers. |
| `data-motion-start` | `top top` | Timeline start. |
| `data-motion-end` | `bottom bottom` | Timeline end. |
| `data-motion-scrub` | `1.2` | Scrub value for the full timeline. |
| `data-motion-background-at` | `0` | Normalized timeline position for background fade. |
| `data-motion-background-duration` | `.28` | Normalized background fade duration. |
| `data-motion-content-at` | `.28` | Normalized timeline position for content movement. |
| `data-motion-content-duration` | `.44` | Normalized content movement duration. |
| `data-motion-aircraft-at` | `.18` | Normalized timeline position for aircraft travel. |
| `data-motion-aircraft-duration` | `.54` | Normalized aircraft travel duration. |
| `data-motion-handoff-at` | `.78` | Normalized timeline position for image handoff. |
| `data-motion-handoff-duration` | `.22` | Normalized image handoff duration. |
| `data-motion-aircraft-scale-to` | `.4` | Arrival scale for authored mode. Source-stage mode calculates scale from the target stage. |
| `data-motion-aircraft-y-to` | `-15` | Arrival yPercent for authored mode. Source-stage mode calculates pixel x/y travel from the target stage. |
| `data-motion-aircraft-opacity-to` | `0` | Fade-out state for the aircraft image during handoff. |
| `data-motion-blueprint-opacity-to` | `1` | Fade-in state for the blueprint image during handoff. |

Legacy range attributes such as `data-motion-aircraft-start`, `data-motion-aircraft-end`, `data-motion-mask-start`, and `data-motion-mask-end` are no longer used by this module. Use the normalized `*-at` and `*-duration` attributes above for source-style sequencing.

## CSS requirements

- Root scroll area should be about `400vh` high.
- The sticky switcher should be `position: sticky; top: 0; height: 100vh; overflow: visible;`.
- The aircraft should be its own sticky layer across the scroll area, not trapped inside the sticky content switcher.
- Prefer a real image element for `aircraft-image` so the plane has intrinsic dimensions.
- In source-stage mode, keep `blueprint` inside the authored spec/center reveal stage; do not attach it to the aircraft wrapper.
- `blueprint` should start visually hidden, either through opacity or the default closed mask.
- The module controls motion, opacity, and mask variables; it does not create layout or imagery.
