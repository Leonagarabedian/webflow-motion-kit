# scroll-media-scale-reveal

A neutral, reusable reconstruction of the scroll-driven media handoff used by the reference composition. It preserves the source motion model without depending on source-site classes, element names, artwork, or copy.

The layout owns the scroll area, sticky layers, media sizing, stacking, and mask images. The module owns four independent scroll animations so each phase retains its original trigger range and scrub response.

## Webflow setup

```html
<section
  data-motion="scroll-media-scale-reveal"
  data-motion-min-width="992"
  data-motion-markers="false"
>
  <div data-motion-target="background"></div>

  <div class="sticky-switcher">
    <div data-motion-target="content-panel">intro content</div>
    <div data-motion-target="content-panel">detail content</div>
  </div>

  <div data-motion-target="primary">
    <img data-motion-target="primary-image" alt="">
  </div>

  <img data-motion-target="reveal" alt="">
</section>
```

The target names describe roles rather than source-site implementation names.

## Required targets

| Target | Purpose |
| --- | --- |
| `background` | Background/light layer that fades in during the first phase. |
| `content-panel` | One or more panels that move downward during the media contraction. |
| `primary` | Primary media wrapper that scales down and shifts upward. |
| `primary-image` | Visible primary image whose mask closes during the handoff. |
| `reveal` | Secondary media whose mask opens during the handoff. |

Each target is optional, but `primary` plus the two image layers produce the complete composition.

## Source-accurate default phases

The reference uses separate top-level ScrollTriggers rather than one master timeline.

| Part | Start | End | Scrub | Default motion |
| --- | --- | --- | --- | --- |
| Background | `top top` | `center center` | `true` | opacity `0 → 1` |
| Primary media | `25% center` | `85% bottom` | `1.2` | scale `1 → .4`; yPercent `0 → -15`; custom accelerating ease |
| Content panels | `50% center` | `85% bottom` | `1.2` | yPercent `0 → 100` |
| Handoff | `85% bottom` | `bottom bottom` | `true` | primary mask closes; reveal mask opens |

The primary ease defaults to cubic Bézier `0.5,0,0.75,0`. The other phases use linear easing.

## Attributes

| Attribute | Default |
| --- | --- |
| `data-motion-min-width` | `992` |
| `data-motion-mobile` | `false` |
| `data-motion-trigger` | root |
| `data-motion-markers` | `false` |
| `data-motion-background-start` | `top top` |
| `data-motion-background-end` | `center center` |
| `data-motion-background-scrub` | `true` |
| `data-motion-primary-start` | `25% center` |
| `data-motion-primary-end` | `85% bottom` |
| `data-motion-primary-scrub` | `1.2` |
| `data-motion-content-start` | `50% center` |
| `data-motion-content-end` | `85% bottom` |
| `data-motion-content-scrub` | `1.2` |
| `data-motion-handoff-start` | `85% bottom` |
| `data-motion-handoff-end` | `bottom bottom` |
| `data-motion-handoff-scrub` | `true` |
| `data-motion-primary-scale-to` | `.4` |
| `data-motion-primary-y-to` | `-15` |
| `data-motion-primary-ease` | generated custom ease |
| `data-motion-primary-ease-curve` | `0.5,0,0.75,0` |
| `data-motion-primary-mask-from` | `100% 150%` |
| `data-motion-primary-mask-to` | `100% 0%` |
| `data-motion-reveal-mask-from` | `100% 0%` |
| `data-motion-reveal-mask-to` | `100% 150%` |
| `data-motion-reveal-mask-y-from` | `200%` |
| `data-motion-reveal-mask-y-to` | `50%` |

Opacity remains `1` on both image layers by default because the source handoff is mask-driven. Optional `data-motion-primary-opacity-*` and `data-motion-reveal-opacity-*` attributes can add a fade for other designs.

## CSS requirements

- Use a root scroll area approximately `400vh` high.
- Use `position: relative` on the root.
- Keep the text/content switcher sticky at `top: 0` with `height: 100vh`.
- Keep the primary media on its own sticky layer across the scroll area.
- Do not place a sticky layer beneath an ancestor with clipping overflow.
- Apply the desired mask image, repeat, position, and initial sizing to `primary-image` and `reveal`. The module animates mask size and position, but does not choose the mask artwork.
- Keep independent hover transforms on nested wrappers so they do not overwrite the scroll-owned transforms.

Below `992px`, and when reduced motion is requested, the module leaves the Webflow-authored static layout intact unless `data-motion-mobile="true"` is explicitly set.

## Lifecycle

Every mounted target's complete pre-existing inline style is captured before animation. Destroying the module, changing out of the active media query, or reinitializing restores those styles exactly.
