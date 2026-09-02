# Animation catalogue

Status: preliminary taxonomy. Implementation begins only after responsive and interaction sampling.

## Tier 1 — reusable primitives

1. Masked line reveal.
2. Word/character rise reveal.
3. Blur line/character reveal.
4. Text scramble.
5. Scroll-progress text highlight/fill.
6. Image clip reveal with configurable edge/direction.
7. Inner-image parallax.
8. Element parallax.
9. Magnetic element with optional inner target.
10. Custom cursor follower.
11. Duplicate-text button/link swap.
12. SVG path/group reveal and elastic hover.
13. Theme-switch trigger.

## Tier 2 — configurable components

1. Flip relocation between Webflow containers.
2. Pinned media scale/zoom.
3. Stacked-image hover.
4. Accordion synchronized with media.
5. Responsive menu reveal.
6. Loader composition.
7. Page transition adapter.
8. Pinned step/process narrative.
9. Work grid/slider view switch.
10. Responsive looping labels.
11. MorphSVG narrative mask.

## Tier 3 — site-specific studies

1. Nothin’ fluid canvas reveal.
2. Nothin’ velocity-reactive glitch section.
3. Voyeur Vérité stacked hero/about/history narratives.
4. Scheme Engine WebGL work browser.
5. Jesko Jets hero/aircraft/globe scroll compositions.
6. a-lign timeline/image-sequence and process compositions.

## Proposed Webflow API

```html
<h2 data-motion="line-reveal"></h2>
<div data-motion="image-reveal" data-motion-direction="left"></div>
<div data-motion="parallax" data-motion-y="-12" data-motion-scrub="1.5"></div>
<a data-motion="magnetic" data-motion-strength="24"></a>
<section data-motion="pinned-media" data-motion-breakpoint="desktop"></section>
```

Each module will document its trigger, action targets, properties, timing, required wrappers, breakpoint behavior, reduced-motion fallback and cleanup contract.
