# scroll-aperture-window

Reusable composition module for a sticky scroll area where a background scales, a central aperture/window scales, optional side panels split apart, an optional parallax layer moves, and an optional logo or title settles into place.

This is not an About-specific choreography module and it does not use project-specific target names. The module only animates named roles that can be reused across different layouts.

## Basic Webflow setup

```html
<section data-motion="scroll-aperture-window">
  <div class="sticky-window">
    <div data-motion-target="parallax-layer"></div>
    <div data-motion-target="background"></div>
    <div data-motion-target="aperture">
      <div data-motion-target="left-panel"></div>
      <div data-motion-target="right-panel"></div>
    </div>
    <a data-motion-target="logo">Logo</a>
  </div>
</section>
```

## Required layout

The behavior relies on layout first:

```css
.aperture-scroll-area {
  height: 300vh;
  position: relative;
}

.sticky-window {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}
```

The module only animates the targets. It should not be used to pile unrelated sections on top of each other.

## Targets

| Target | Motion |
| --- | --- |
| `logo` | Optional y/scale travel. |
| `background` | Optional scale and x drift. |
| `aperture` | Optional window scale. |
| `left-panel` | Optional leftward panel split on desktop. |
| `right-panel` | Optional rightward panel split on desktop. |
| `parallax-layer` | Optional y movement on desktop. |

## Attributes

| Attribute | Default | Purpose |
| --- | --- | --- |
| `data-motion="scroll-aperture-window"` | required | Mounts the module. |
| `data-motion-start` | `top top` | ScrollTrigger start. |
| `data-motion-end` | `bottom bottom` | ScrollTrigger end. |
| `data-motion-scrub` | `true` | Scrub value. Use a number for smoothing. |
| `data-motion-min-width` | `992` | Desktop breakpoint. |
| `data-motion-mobile-panels` | `false` | Allows left/right panel split on mobile if needed. |
| `data-motion-bg-scale-from` | `1` | Starting background scale. |
| `data-motion-bg-scale-to` | `6.5` | Final background scale. |
| `data-motion-bg-x-from` | `0` | Starting background xPercent. |
| `data-motion-bg-x-to` | `-2` | Final background xPercent. |
| `data-motion-aperture-scale-from` | `1` | Starting aperture/window scale. |
| `data-motion-aperture-scale-to` | `8` | Final aperture/window scale. |
| `data-motion-panel-distance-vw` | `50` | Panel split distance. |
| `data-motion-logo-y-from` | `44vh` | Logo/title starting y. |
| `data-motion-logo-y-to` | `0vh` | Logo/title final y. |
| `data-motion-logo-scale-from` | `1.25` | Logo/title starting scale. |
| `data-motion-logo-scale-to` | `1` | Logo/title final scale. |
| `data-motion-parallax-y-from` | `0vh` | Optional parallax layer starting y. |
| `data-motion-parallax-y-to` | `100vh` | Optional parallax layer final y. |
| `data-motion-markers` | `false` | Debug markers. |

## Notes

Use this module as a reusable scroll composition primitive. It expects Webflow to provide the visual layout, z-index order, sticky viewport, and scroll runway height. Keep project-specific class names and imagery in Webflow; keep the motion API generic.
