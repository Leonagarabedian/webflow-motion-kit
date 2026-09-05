# Animation catalogue

Status: implementation catalogue. Checked items ship in the current bundle.

## Primitive modules

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
12. [x] SVG path/group reveal and elastic hover.
13. [x] Theme-switch trigger.

## Component modules

1. [x] Flip relocation between Webflow containers.
2. [x] Pinned media scale/zoom.
3. [x] Stacked-image hover.
4. [x] Accordion synchronized with media.
5. [x] Responsive menu reveal.
6. [x] Loader composition.
7. [x] Page transition adapter.
8. [x] Pinned step/process narrative.
9. [x] Work grid/slider view switch.
10. [x] Responsive looping labels.
11. [x] MorphSVG narrative mask.
12. [x] Responsive sticky card stack.

## Advanced packages

1. [x] Nothin’-informed fluid canvas engine.
2. [x] Nothin’-informed velocity-reactive effect.
3. [x] Voyeur Vérité-informed narrative composition using main-kit modules.
4. [x] Scheme Engine-informed WebGL work browser.
5. [x] House of Corto-informed infinite product world.
6. [x] Jesko Jets-informed hero/aircraft/globe scroll composition.
7. [x] a-lign-informed timeline/image-sequence composition.

These are original reusable implementations derived from observed behavior. They accept placeholder or project-approved media and do not redistribute source-site assets or claim source-site visual fidelity without project-specific integration and synchronized QA.

## Webflow API

```html
<h2 data-motion="line-reveal"></h2>
<div data-motion="image-clip" data-motion-clip-from="inset(0 0 100% 0)"></div>
<div data-motion="parallax" data-motion-from="-5" data-motion-to="-20" data-motion-scrub="1.5"></div>
<a data-motion="magnetic" data-motion-strength="24"></a>
<section data-motion="pinned-media" data-motion-min-width="992"></section>
```

Each shipped module documents its Webflow structure and configurable attributes in `WEBFLOW_INTEGRATION.md`. Tier 3 studies stay separate because they require site-specific canvas/WebGL assets and should not inflate every Webflow project.


## Shared motion tokens

The main MotionKit now accepts semantic aliases anywhere the corresponding data attribute is read. Raw values remain valid.

```html
<h2
  data-motion="line-reveal"
  data-motion-duration="slow"
  data-motion-stagger="relaxed"
  data-motion-y="reveal"
  data-motion-ease="enter"
></h2>
```

Available token groups live in `src/core/tokens.js` and are exposed at `WebflowMotionKit.tokens`. The code-level category inventory is exposed at `WebflowMotionKit.moduleInventory`.
