# Animation catalogue

Status: implementation catalogue. Checked items ship in the current bundle.

## Tier 1 — reusable primitives

1. [x] Masked line reveal.
2. [x] Word/character rise reveal.
3. [x] Blur line/character reveal.
4. [x] Text scramble.
5. [x] Scroll-progress text highlight/fill.
6. [x] Image clip reveal with configurable edge/direction.
7. [x] Inner-image parallax.
8. [x] Element parallax.
9. [x] Magnetic element with optional inner target.
10. [x] Custom cursor follower.
11. [x] Duplicate-text button/link swap.
12. SVG path/group reveal and elastic hover.
13. [x] Theme-switch trigger.

## Tier 2 — configurable components

1. [x] Flip relocation between Webflow containers.
2. [x] Pinned media scale/zoom.
3. [x] Stacked-image hover.
4. [x] Accordion synchronized with media.
5. Responsive menu reveal.
6. Loader composition.
7. Page transition adapter.
8. [x] Pinned step/process narrative.
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

## Webflow API

```html
<h2 data-motion="line-reveal"></h2>
<div data-motion="image-reveal" data-motion-direction="left"></div>
<div data-motion="parallax" data-motion-y="-12" data-motion-scrub="1.5"></div>
<a data-motion="magnetic" data-motion-strength="24"></a>
<section data-motion="pinned-media" data-motion-breakpoint="desktop"></section>
```

Each shipped module documents its Webflow structure and configurable attributes in `WEBFLOW_INTEGRATION.md`. Tier 3 studies stay separate because they require site-specific canvas/WebGL assets and should not inflate every Webflow project.
