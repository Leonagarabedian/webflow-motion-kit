# sticky-stage-runway

Reusable primitive for Jesko-style scroll choreography foundations.

It owns only the layout contract:

- a runway wrapper
- an optional sticky or ScrollTrigger-pinned viewport
- an inner stage
- optional debug confirmation UI for Webflow testing
- optional explicit stacked-layer mode for later transition modules

It does not animate content between layers. Pair it with later reusable modules such as layer lift, traveling media proxy, masked media switch, or depth handoff.

## Safe Webflow foundation setup

Use this mode first when testing in Webflow. It keeps sections in normal document flow and does **not** pile them on top of each other.

```html
<section
  data-motion="sticky-stage-runway"
  data-motion-layer-mode="none"
  data-motion-debug="true"
>
  <div data-motion-target="sticky">
    <div data-motion-target="stage">
      <section>Hero</section>
      <section>Why</section>
      <section>Created</section>
    </div>
  </div>
</section>
```

## Explicit stacked stage setup

Use this only when a later transition module actually needs a stacked stage.

```html
<section
  data-motion="sticky-stage-runway"
  data-motion-layer-mode="stack"
  data-motion-scroll-vh="560"
  data-motion-pin="true"
  data-motion-active-layer="hero"
  data-motion-debug="true"
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
| `data-motion-target="sticky"` | root fallback | Element that can later stick or pin. |
| `data-motion-target="stage"` | sticky fallback | Inner stage wrapper. |
| `data-motion-layer-mode` | `flow` | Keeps normal document flow by default. Use `stack` only when intentional. |
| `data-motion-scroll-vh` | `500` | Total runway height in viewport units when stacked. |
| `data-motion-viewport-vh` | `100` | Sticky viewport height when stacked. |
| `data-motion-min-width` | `992` | Desktop breakpoint. |
| `data-motion-pin` | `true` | Uses ScrollTrigger pin only in `stack` mode. |
| `data-motion-layer-selector` | `[data-motion-layer], [data-motion-target="layer"]` | Layer query inside the stage for `stack` mode. |
| `data-motion-active-layer` | first layer | Fallback layer to show only in `stack` mode. |
| `data-motion-debug` | `false` | Shows a small mounted/progress badge for Webflow testing. |
| `data-motion-id` | `sticky-stage-runway` | ScrollTrigger id. |

## How to confirm in Webflow

For the first foundation test, use `data-motion-layer-mode="none"` or omit the attribute. The page should remain readable in normal section order.

When the module is actually running, the stage should show a small debug badge that says `Sticky stage runway mounted`. The badge should report `mode: flow` unless you explicitly set `data-motion-layer-mode="stack"`.

If sections are visually piled together in Webflow, the problem is in the Webflow classes/structure, not a valid confirmation state for this primitive.

## Notes

- This is a foundation module, not an About-specific module.
- The module injects scoped styles only when mounted.
- It cleans up inline styles and marker attributes on destroy.
- The first test page using it is `/about-choreo-test` on the Branda site.
