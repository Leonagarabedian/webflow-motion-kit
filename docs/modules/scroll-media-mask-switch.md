# scroll-media-mask-switch

A reusable scroll composition for switching between two layered media or visual states with a clipped reveal. The layout owns the frame, sizing, and imagery; the module only animates generic layer targets.

## Webflow setup

```html
<section
  data-motion="scroll-media-mask-switch"
  data-motion-direction="up"
  data-motion-mode="reveal"
  data-motion-start="top center"
  data-motion-end="bottom center"
  data-motion-scrub="true"
>
  <div class="media-frame">
    <div data-motion-target="base-layer">...</div>
    <div data-motion-target="reveal-layer">...</div>
  </div>
</section>
```

## Targets

| Target | Purpose |
| --- | --- |
| `base-layer` | The initially visible layer. In the default `reveal` mode it stays stable underneath the reveal layer. |
| `reveal-layer` | The layer revealed through the scroll range. |

## Attributes

| Attribute | Default | Notes |
| --- | --- | --- |
| `data-motion-mode` | `reveal` | `reveal` keeps the base layer stable while the reveal layer opens over it. `swap` also clips the base away. |
| `data-motion-direction` | `up` | Supports `up`, `down`, `left`, `right`. |
| `data-motion-start` | `top center` | ScrollTrigger start. |
| `data-motion-end` | `bottom center` | ScrollTrigger end. |
| `data-motion-scrub` | `true` | Boolean or numeric scrub value. |
| `data-motion-min-width` | `992` | Desktop breakpoint. |
| `data-motion-mobile` | `false` | Allows the effect under the desktop breakpoint. |
| `data-motion-base-scale-from` | `1` | Optional base layer start scale. |
| `data-motion-base-scale-to` | `1.03` | Optional base layer end scale. |
| `data-motion-reveal-scale-from` | `1.08` | Optional reveal layer start scale. |
| `data-motion-reveal-scale-to` | `1` | Optional reveal layer end scale. |
| `data-motion-base-opacity-from` | `1` | Optional base layer start opacity. |
| `data-motion-base-opacity-to` | `1` | Optional base layer end opacity. |
| `data-motion-reveal-opacity-from` | `1` | Optional reveal layer start opacity. |
| `data-motion-reveal-opacity-to` | `1` | Optional reveal layer end opacity. |

## Notes

- Keep both layers positioned inside the same frame.
- Use `overflow: hidden` on the frame when you want a clean media window.
- Use `data-motion-mode="swap"` only when the outgoing layer should visibly clip away too.
- This is intentionally generic: no source-specific target names, classes, or assumptions.
- Useful for image-to-image reveals, material switches, detail/blueprint reveals, and branded section transitions.
