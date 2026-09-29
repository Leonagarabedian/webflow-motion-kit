# scroll-dual-sticky-media-reveal

A source-faithful reconstruction of the verified dual-sticky media composition. This module intentionally mirrors the source mechanics first. Reusability can be generalized later, after the structure is proven in Webflow.

The module assumes two independent sticky systems inside one long scroll root:

1. a sticky content switcher containing two vertically stacked content states;
2. a separate sticky media wrapper containing the primary visual.

The reveal visual belongs to the incoming content state, not to the media wrapper. Both visuals are synchronized by sharing the same scroll root and handoff trigger range.

## Exact Webflow hierarchy

Create this structure from scratch before wiring the animation:

```text
SECTION / COMPOSITION ROOT
[data-motion="scroll-dual-sticky-media-reveal"]
position: relative
height: 400vh

├── CONTENT SWITCHER
│   position: sticky
│   top: 0
│   height: 100vh
│
│   ├── PRIMARY CONTENT STATE
│   │   [data-motion-target="content-primary"]
│   │   position: relative
│   │
│   └── REVEAL CONTENT STATE
│       [data-motion-target="content-reveal"]
│       position: absolute
│       left: 0
│       right: 0
│       bottom: 100%
│
│       └── REVEAL VISUAL
│           [data-motion-target="reveal-visual"]
│           position: absolute within the reveal content composition
│           width: 100%
│           height: 100%
│           authored mask image required
│
├── BACKGROUND
│   [data-motion-target="background"]
│   position: absolute
│   top: 0
│   bottom: 0
│   may bleed beyond container gutters
│
└── MEDIA
    [data-motion-target="media"]
    position: sticky
    margin-top: 100vh
    top: 50vh
    height: 50vh
    z-index above the background
    perspective: 1000px if required by the artwork

    └── PRIMARY VISUAL
        [data-motion-target="primary-visual"]
        width: 100%
        authored vertical offset belongs here, not on MEDIA
        authored mask image required
```

The content switcher and media element are siblings under the same composition root. Do not nest the media inside the content switcher.

## Source-authored geometry that must remain CSS-owned

The animation values only reproduce the source correctly when the static layout establishes the same geometry first.

### Composition root

```css
.composition-root {
  position: relative;
  height: 400vh;
}
```

### Content switcher

```css
.content-switcher {
  position: sticky;
  top: 0;
  height: 100vh;
}
```

The source also expands the horizontal clipping bounds past the normal container gutters. Reproduce that only if the moving content would otherwise clip incorrectly.

### Primary content state

```css
.content-primary {
  position: relative;
  z-index: 1;
}
```

### Incoming content state

```css
.content-reveal {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  z-index: 1;
}
```

This authored vertical stacking is essential. The module moves both content states together from `yPercent: 0` to `100`.

### Media sticky

```css
.media {
  position: sticky;
  margin-top: 100vh;
  top: 50vh;
  height: 50vh;
}
```

Do not replace this geometry with a conventional centered 100vh media wrapper and expect the same GSAP values to compensate. The CSS positioning is part of the motion.

### Primary visual

The source visual has an authored vertical offset inside the sticky media wrapper. Keep that offset on a child element so it does not conflict with GSAP transforms on `media`.

Equivalent pattern:

```css
.primary-visual {
  width: 100%;
  transform: translateY(-50%);
}
```

If your artwork requires a different static offset, author it on a nested visual wrapper rather than changing the scroll-owned transform on `media`.

## Required targets

| Target | Structural role | Animated property |
| --- | --- | --- |
| `background` | Full composition background | opacity `0 → 1` |
| `content-primary` | Initial content state | yPercent `0 → 100` |
| `content-reveal` | Incoming state positioned above the first | yPercent `0 → 100` |
| `media` | Independent sticky media wrapper | scale `1 → .4`, yPercent `0 → -15` |
| `primary-visual` | Visual inside sticky media | closing mask |
| `reveal-visual` | Visual inside incoming content composition | opening/repositioning mask |

## Verified source phase ranges

The source uses independent ScrollTriggers against the same long root.

| Phase | Start | End | Scrub | Motion |
| --- | --- | --- | --- | --- |
| Background | `top top` | `center center` | `true` | opacity `0 → 1` |
| Media | `25% center` | `85% bottom` | `1.2` | scale `1 → .4`; yPercent `0 → -15` |
| Content states | `50% center` | `85% bottom` | `1.2` | yPercent `0 → 100` on both states together |
| Mask handoff | `85% bottom` | `bottom bottom` | `true` | primary closes while reveal opens |

The media ease defaults to cubic Bézier `0.5,0,0.75,0`. The remaining phases default to linear easing.

## Mask requirements

The source effect depends on two distinct authored mask images. The JavaScript only animates size and reveal-mask position. It does not create the artwork.

Primary visual defaults:

```text
mask-size: 100% 150% → 100% 0%
```

Reveal visual defaults:

```text
mask-size: 100% 0% → 100% 150%
mask-position-y: 200% → 50%
```

Author the correct `mask-image`, `mask-repeat`, initial `mask-position`, and any artwork-specific sizing in Webflow/CSS before mounting the module.

## Module attributes

Use on the composition root:

```html
<div
  data-motion="scroll-dual-sticky-media-reveal"
  data-motion-min-width="992"
  data-motion-markers="false"
>
```

Optional overrides:

| Attribute | Default |
| --- | --- |
| `data-motion-trigger` | root |
| `data-motion-mobile` | `false` |
| `data-motion-background-start` | `top top` |
| `data-motion-background-end` | `center center` |
| `data-motion-content-start` | `50% center` |
| `data-motion-content-end` | `85% bottom` |
| `data-motion-content-scrub` | `1.2` |
| `data-motion-media-start` | `25% center` |
| `data-motion-media-end` | `85% bottom` |
| `data-motion-media-scrub` | `1.2` |
| `data-motion-media-scale-to` | `.4` |
| `data-motion-media-y-to` | `-15` |
| `data-motion-media-ease-curve` | `0.5,0,0.75,0` |
| `data-motion-handoff-start` | `85% bottom` |
| `data-motion-handoff-end` | `bottom bottom` |
| `data-motion-primary-mask-from` | `100% 150%` |
| `data-motion-primary-mask-to` | `100% 0%` |
| `data-motion-reveal-mask-from` | `100% 0%` |
| `data-motion-reveal-mask-to` | `100% 150%` |
| `data-motion-reveal-mask-y-from` | `200%` |
| `data-motion-reveal-mask-y-to` | `50%` |

## Optional previous-section overlap

Do not put the source `margin-top: -100vh` on the core composition by default.

That offset controls how this composition enters relative to the preceding section. It is not required for the internal media/content choreography. In the verified source, the previous content moves upward while this next root is pulled upward by one viewport, creating an overlapping section handoff.

Treat that as a separate layout/handoff decision:

```css
/* only when reproducing the overlapping incoming handoff */
.composition-root.is-overlap-in {
  margin-top: -100vh;
}
```

The internal ScrollTriggers continue to use the composition root either way.

## Important constraints

- Do not nest `media` inside the content switcher.
- Do not move `reveal-visual` under the primary media merely for convenience. The verified structure places it inside the incoming content system.
- Do not put the primary visual's authored positioning transform on `media`; GSAP owns the media transform.
- Do not animate the two content states independently. They move together as an authored vertical stack.
- Do not use GSAP pinning for this composition. CSS sticky establishes the two independent sticky systems.
- Do not add the `-100vh` incoming overlap until the core composition works correctly by itself.

## Responsive behavior

The source desktop mechanics are the baseline. Below the configured minimum width, this module leaves the authored Webflow layout untouched unless `data-motion-mobile="true"` is explicitly enabled.

The source removes the desktop `-100vh` incoming overlap at the smaller breakpoint, further confirming that the overlap is a surrounding section-handoff behavior rather than a required part of the core module.

## Lifecycle

The module captures each animated target's complete pre-existing inline style before mounting. On teardown or media-query exit it kills its ScrollTriggers and restores those exact styles.
