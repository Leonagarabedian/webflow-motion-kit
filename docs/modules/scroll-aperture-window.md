# scroll-aperture-window

Reusable source-derived module based on the Jesko Jets hero/aperture scroll controls.

This is not an About-specific choreography module. It scopes the original reference behavior into a motion-kit composition module:

- scroll area trigger
- optional logo travel
- background scale + x drift
- aperture/window scale
- left/right panel split on desktop
- optional sky/background parallax on desktop

The module does not create the section layout. Webflow must provide the scroll area height and sticky/viewport structure, the same way the reference site does with CSS-owned scroll areas.

## Basic Webflow setup

```html
<section data-motion="scroll-aperture-window">
  <div class="sticky-window">
    <div data-motion-target="sky"></div>
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

The reference behavior relies on layout first:

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

| Target | Source equivalent | Motion |
| --- | --- | --- |
| `logo` | `.link-logo` | y `44vh → 0vh`, scale `1.25 → 1` |
| `background` | `.hero-w_bg` | scale `1 → 6.5`, xPercent `0 → -2` |
| `aperture` | `.hero-s` | scale `1 → 8` |
| `left-panel` | `[hero-s_left]` | x `0vw → -50vw` on desktop |
| `right-panel` | `[hero-s_right]` | x `0vw → 50vw` on desktop |
| `sky` | `.sky-bg_hero` | y `0vh → 100vh` on desktop |

## Attributes

| Attribute | Default | Purpose |
| --- | --- | --- |
| `data-motion="scroll-aperture-window"` | required | Mounts the module. |
| `data-motion-start` | `top top` | ScrollTrigger start. |
| `data-motion-end` | `bottom bottom` | ScrollTrigger end. |
| `data-motion-scrub` | `true` | Scrub value. Use a number for smoothing. |
| `data-motion-min-width` | `992` | Desktop breakpoint. |
| `data-motion-mobile-panels` | `false` | Allows left/right panel split on mobile if needed. |
| `data-motion-bg-scale-to` | `6.5` | Final background scale. |
| `data-motion-bg-x-to` | `-2` | Final background xPercent. |
| `data-motion-aperture-scale-to` | `8` | Final aperture/window scale. |
| `data-motion-panel-distance-vw` | `50` | Panel split distance. |
| `data-motion-logo-y-from` | `44vh` | Logo starting y. |
| `data-motion-logo-scale-from` | `1.25` | Logo starting scale. |
| `data-motion-sky-y-to` | `100vh` | Sky/background parallax y. |
| `data-motion-markers` | `false` | Debug markers. |

## Source notes

From the inspected ZIP:

- `.hero_scroll-area` is the trigger.
- `.hero-w` / sticky layout is CSS-owned.
- `.hero-w_bg`, `.hero-s`, `[hero-s_left]`, `[hero-s_right]`, `.sky-bg_hero`, and `.link-logo` are separate simultaneous ScrollTriggers/timelines.
- Desktop panels are not animated on mobile in the original; background and aperture still scale on mobile.

## Related future modules

The next source-derived modules should be separate:

- `scroll-section-lift` for `.about-s` style vertical lift
- `scroll-mask-switch` for `.img-jet` / `.blueprint` CSS-variable masks
- `scroll-highlight-text` for `[data-highlight-text]`
- `media-accordion-reveal` for the benefits accordion
