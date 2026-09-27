# sticky-stage-runway

Reusable primitive for Jesko-style tall-scroll choreography foundations.

It owns only the layout contract:

- a tall scroll runway
- a sticky or ScrollTrigger-pinned viewport
- an inner stage
- optional stacked layers with one active fallback layer

It does not animate content between layers. Pair it with later reusable modules such as layer lift, traveling media proxy, masked media switch, or depth handoff.

## Basic Webflow setup

```html
<section
  data-motion="sticky-stage-runway"
  data-motion-scroll-vh="560"
  data-motion-pin="true"
  data-motion-active-layer="hero"
>
  <div data-motion-target="sticky">
    <div data-motion-target="stage">
      <div data-motion-layer="hero">...</div>
      <div data-motion-layer="why">...</div>
      <div data-motion-layer="created">...</div>
    </div>
  </div>
</section>
```

## Attributes

| Attribute | Default | Purpose |
| --- | --- | --- |
| `data-motion="sticky-stage-runway"` | required | Mounts the primitive. |
| `data-motion-target="sticky"` | root fallback | Element that sticks or pins. |
| `data-motion-target="stage"` | sticky fallback | Inner viewport stage. |
| `data-motion-scroll-vh` | `500` | Total runway height in viewport units. |
| `data-motion-viewport-vh` | `100` | Sticky viewport height. |
| `data-motion-min-width` | `992` | Desktop breakpoint. |
| `data-motion-pin` | `true` | Uses ScrollTrigger pin. Set `false` for CSS sticky. |
| `data-motion-layer-selector` | `[data-motion-layer], [data-motion-target="layer"], .about-choreo-layer` | Layer query inside the stage. |
| `data-motion-active-layer` | empty | Optional fallback layer to show while later modules are not mounted. |
| `data-motion-layer-mode` | `stack` | Set `none` to avoid layer stacking. |
| `data-motion-id` | `sticky-stage-runway` | ScrollTrigger id. |

## Notes

- This is a foundation module, not an About-specific module.
- The module injects its own scoped styles only when mounted.
- It cleans up inline styles and marker attributes on destroy.
- The first test page using it is `/about-choreo-test` on the Branda site.
