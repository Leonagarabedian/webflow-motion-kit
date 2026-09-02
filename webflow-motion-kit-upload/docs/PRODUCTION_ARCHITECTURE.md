# Production architecture for the Webflow motion system

## Chosen dependency strategy

The external bundle owns GSAP and the plugins it uses. Webflow owns markup, CMS content and base styling. On sites using this bundle, avoid enabling a second copy of the same GSAP runtime through Webflow unless a documented native interaction requires it.

This gives every connected Webflow site the same tested GSAP version and plugin behavior.

## Repository layout

```text
webflow-motion-system/
├── src/
│   ├── main.js
│   ├── core/
│   │   ├── create-motion-app.js
│   │   ├── registry.js
│   │   ├── lifecycle.js
│   │   ├── media.js
│   │   ├── refresh.js
│   │   └── reduced-motion.js
│   ├── primitives/
│   │   ├── line-reveal.js
│   │   ├── character-reveal.js
│   │   ├── text-scramble.js
│   │   ├── image-clip-reveal.js
│   │   ├── parallax.js
│   │   ├── magnetic.js
│   │   ├── cursor-follow.js
│   │   └── link-swap.js
│   ├── components/
│   │   ├── flip-relocate.js
│   │   ├── pinned-media.js
│   │   ├── accordion-media.js
│   │   ├── menu-reveal.js
│   │   └── page-transition.js
│   ├── compositions/
│   │   ├── stacked-narrative.js
│   │   ├── process-steps.js
│   │   └── image-sequence.js
│   ├── advanced/
│   │   ├── fluid-reveal.js
│   │   ├── webgl-carousel.js
│   │   └── globe.js
│   └── adapters/
│       ├── webflow.js
│       ├── barba.js
│       └── lenis.js
├── docs/
│   ├── modules/
│   └── webflow-recipes/
├── package.json
└── vite.config.js
```

## Runtime lifecycle

1. Webflow renders the page and CMS collections.
2. The external module loads.
3. The Webflow adapter waits for DOM readiness and fonts.
4. The registry scans for supported `data-motion` attributes.
5. Each matching module initializes inside its own scoped GSAP context.
6. Images/video metadata trigger one debounced ScrollTrigger refresh.
7. Page transitions or CMS remounts call module cleanup before reinitialization.
8. Breakpoint changes revert the relevant matchMedia context and rebuild only the affected modules.

## Module contract

Every module must expose:

```js
export const moduleDefinition = {
  name: "line-reveal",
  selector: '[data-motion="line-reveal"]',
  plugins: ["SplitText", "ScrollTrigger"],
  init(element, context) {
    // Create scoped animation.
    return () => {
      // Kill triggers, revert splits and remove listeners.
    };
  }
};
```

Every module documents:

- Purpose and visual result.
- Trigger target and action target.
- Required Webflow hierarchy.
- Supported attributes and defaults.
- Desktop/tablet/mobile behavior.
- Reduced-motion result.
- GSAP plugins used.
- Transform/property ownership.
- Cleanup behavior.
- Source-study references.

## Attribute standard

```html
<h2
  data-motion="line-reveal"
  data-motion-start="top 90%"
  data-motion-stagger="0.05">
</h2>

<div
  data-motion="parallax"
  data-motion-y="-12"
  data-motion-scrub="1.5">
</div>

<a
  data-motion="magnetic"
  data-motion-strength="24">
  <span data-motion-target="inner"></span>
</a>
```

Rules:

- `data-motion` selects behavior, never visual styling.
- `data-motion-target` expresses a relationship inside the current component.
- Optional numeric attributes override documented defaults.
- Modules target descendants of their own root rather than global shared classes.
- Page-specific compositions receive explicit names rather than overloading primitives.

## Property ownership

Independent behaviors must not write to the same transform layer.

```html
<article data-motion="parallax">
  <div class="card-hover-layer" data-motion-target="hover">
    <div class="card-media-layer" data-motion-target="media"></div>
  </div>
</article>
```

- Outer root owns scroll `y`.
- Hover layer owns hover `scale`/rotation.
- Media layer owns image `yPercent` or clip-path.

## Deployment

```text
Local source → GitHub → Netlify build → public main.js → Webflow footer loader
```

The production Webflow loader references one stable manifest or versioned bundle. Netlify supplies cross-origin headers. Development mode can point the same Webflow page at a local Vite server for hot reloading.

## Initial implementation order

1. Core lifecycle and registry.
2. Masked line reveal.
3. Image clip reveal.
4. Parallax.
5. Magnetic interaction.
6. Cursor follower.
7. Text scramble.
8. Link/button text swap.
9. Flip relocation.
10. Pinned media.

Advanced WebGL/canvas studies remain isolated until the core library is stable.
