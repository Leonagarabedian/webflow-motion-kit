# scroll-section-lift

Reusable scroll module for lifting one or more authored elements through a scroll range.

This module is for cases where layout remains normal, but selected child elements need to move vertically as the parent section enters and exits the viewport. It does not stack unrelated sections, create a sticky wrapper, or restructure the page.

## Basic Webflow setup

```html
<section data-motion="scroll-section-lift">
  <div data-motion-target="lift-item">Lifted content</div>
</section>
```

Multiple lift items can be used inside the same root:

```html
<section data-motion="scroll-section-lift" data-motion-stagger="0.08">
  <div data-motion-target="lift-item">First</div>
  <div data-motion-target="lift-item">Second</div>
</section>
```

## Targets

| Target | Purpose |
| --- | --- |
| `lift-item` | Element or elements that move during the scroll range. |

## Attributes

| Attribute | Default | Purpose |
| --- | --- | --- |
| `data-motion="scroll-section-lift"` | required | Mounts the module. |
| `data-motion-target="lift-item"` | required | Marks each element to move. |
| `data-motion-trigger` | root | Optional selector for an external trigger. |
| `data-motion-start` | `top bottom` | ScrollTrigger start. |
| `data-motion-end` | `bottom top` | ScrollTrigger end. |
| `data-motion-scrub` | `true` | Scrub value. Use a number for smoothing. |
| `data-motion-min-width` | `992` | Desktop breakpoint. |
| `data-motion-mobile` | `false` | Allows the motion to run below the desktop breakpoint. |
| `data-motion-y-from` | `0vh` | Starting y transform. |
| `data-motion-y-to` | `-100vh` | Ending y transform. |
| `data-motion-scale-from` | `1` | Starting scale. |
| `data-motion-scale-to` | `1` | Ending scale. |
| `data-motion-opacity-from` | `1` | Starting opacity. |
| `data-motion-opacity-to` | `1` | Ending opacity. |
| `data-motion-stagger` | `0` | Optional stagger for multiple lift items. |
| `data-motion-ease` | `none` | Ease value. |
| `data-motion-markers` | `false` | Debug markers. |

## Layout notes

The parent section should define the scroll distance through its own height or surrounding content. The module only animates the marked lift items.

Suggested visual test layout:

```css
.lift-demo {
  min-height: 220vh;
  position: relative;
}

.lift-demo__item {
  position: sticky;
  top: 35vh;
}
```

The sticky styling belongs to Webflow/CSS, not the module.

## Related modules

- `scroll-aperture-window` for aperture/window expansion.
- `scroll-mask-switch` for future media mask handoffs.
