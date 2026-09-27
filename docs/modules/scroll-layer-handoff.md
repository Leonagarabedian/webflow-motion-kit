# scroll-layer-handoff

A reusable scroll composition for handing visual emphasis from one authored layer to another. A long scroll area holds a sticky viewport, content panels move out, the primary visual layer travels into position, and then the primary image fades while a reveal layer opens in its place.

The layout owns the scroll area, sticky viewport, media sizing, and masks. The module drives the effect with one sequenced ScrollTrigger timeline so the primary movement ends before the visual handoff begins.

## Webflow setup

```html
<section
  data-motion="scroll-layer-handoff"
  data-motion-min-width="992"
  data-motion-markers="false"
>
  <div data-motion-target="background"></div>

  <div class="sticky-switcher">
    <div data-motion-target="content-panel">intro content</div>
    <div data-motion-target="content-panel">detail content</div>
  </div>

  <div data-motion-target="primary">
    <img data-motion-target="primary-image" />
  </div>

  <img data-motion-target="reveal" />
</section>
```

## Required targets

| Target | Purpose |
| --- | --- |
| `background` | Background or light layer that fades in during the first part of the scroll area. |
| `content-panel` | One or more text or detail panels that move downward through the middle of the scroll area. |
| `primary` | The primary visual wrapper that scales down and shifts upward into its arrival state. |
| `primary-image` | The visible primary image layer that fades during the handoff. |
| `reveal` | The secondary visual layer that fades or mask-reveals during the handoff. |

## Default timing

The effect is one scrubbed timeline from `data-motion-start` to `data-motion-end`.

| Part | Timeline position | Default motion |
| --- | --- | --- |
| Background | `0` to `.28` | opacity `0` to `1` |
| Primary travel | `.18` to `.72` | scale `1` to `.4`, yPercent `0` to `-15` |
| Content panels | `.28` to `.72` | yPercent `0` to `100` |
| Handoff | `.78` to `1` | primary opacity `1` to `0`; reveal opacity `0` to `1`, reveal mask opens |

## Attributes

| Attribute | Default | Notes |
| --- | --- | --- |
| `data-motion-min-width` | `992` | Desktop breakpoint. |
| `data-motion-mobile` | `false` | Allows the effect below the desktop breakpoint. |
| `data-motion-trigger` | root | Optional trigger selector. |
| `data-motion-markers` | `false` | Shows ScrollTrigger markers. |
| `data-motion-start` | `top top` | Timeline start. |
| `data-motion-end` | `bottom bottom` | Timeline end. |
| `data-motion-scrub` | `1.2` | Scrub value for the full timeline. |
| `data-motion-background-at` | `0` | Normalized timeline position for background fade. |
| `data-motion-background-duration` | `.28` | Normalized background fade duration. |
| `data-motion-content-at` | `.28` | Normalized timeline position for content movement. |
| `data-motion-content-duration` | `.44` | Normalized content movement duration. |
| `data-motion-primary-at` | `.18` | Normalized timeline position for primary travel. |
| `data-motion-primary-duration` | `.54` | Normalized primary travel duration. |
| `data-motion-handoff-at` | `.78` | Normalized timeline position for image handoff. |
| `data-motion-handoff-duration` | `.22` | Normalized image handoff duration. |
| `data-motion-primary-scale-to` | `.4` | Arrival scale for the primary wrapper. |
| `data-motion-primary-y-to` | `-15` | Arrival yPercent for the primary wrapper. |
| `data-motion-primary-opacity-to` | `0` | Fade-out state for the primary image during handoff. |
| `data-motion-reveal-opacity-to` | `1` | Fade-in state for the reveal image during handoff. |

Older range-style attributes are not used by this module. Use the normalized `*-at` and `*-duration` attributes above for sequencing.

## CSS requirements

- Root scroll area should be about `400vh` high.
- The sticky switcher should be `position: sticky; top: 0; height: 100vh; overflow: visible;`.
- The primary visual should be its own sticky layer across the scroll area, not trapped inside the sticky content switcher.
- Prefer a real image element for `primary-image` so the visual has intrinsic dimensions.
- `reveal` should start visually hidden, either through opacity or the default closed mask.
- The module controls motion, opacity, and mask variables. It does not create layout or imagery.
