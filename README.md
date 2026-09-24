# Webflow Motion Kit

A production-oriented GSAP animation library for Webflow. Webflow owns markup, layout and CMS content; this package discovers semantic data attributes and mounts the matching behavior.

## Local development

```bash
npm install
npm run dev
```

Run the verification suite with:

```bash
npm run check
```

## Deployment and Webflow installation

The production bundle is deployed with GitHub Pages. A push to `main` runs `.github/workflows/deploy-pages.yml`, which validates the kit, builds `dist`, and publishes the generated assets.

Branda loads the production bundle site-wide from:

```html
<link rel="stylesheet" href="https://leonagarabedian.github.io/webflow-motion-kit/motion-kit.css?v=MAIN_SHA">
<script defer src="https://leonagarabedian.github.io/webflow-motion-kit/motion-kit.js?v=MAIN_SHA"></script>
```

Use the current short `main` commit SHA for `MAIN_SHA` when you want to force Webflow/browser caches to pick up a newly deployed build. Do not add separate page-level copies of the motion-kit CSS or JavaScript; individual pages should provide only Webflow layout and `data-motion` attributes unless a page explicitly requires another independent script.

The bundle initializes automatically on Webflow ready. Its public API is also available at `window.WebflowMotionKit`:

```js
window.WebflowMotionKit.init(document);
window.WebflowMotionKit.refresh();
window.WebflowMotionKit.destroy(document);
```

For page-transition tools, destroy the outgoing container before removal, initialize the incoming container after insertion, then refresh ScrollTrigger.

## Included modules

| Module | Webflow attribute | Intended layer |
|---|---|---|
| Line reveal | `data-motion="line-reveal"` | Text element |
| Word/character reveal | `data-motion="text-reveal"` | Text element |
| Blur reveal | `data-motion="blur-reveal"` | Text element |
| Scramble text | `data-motion="scramble-text"` | Text or link element |\n| Scroll text position Flip | `data-motion="scroll-text-position-flip"` | Text element moving between two authored layout states |\n| Rotating 3D scroll gallery | `data-motion="rotating-3d-scroll-gallery"` | Five source-faithful Codrops 3D scroll variants with optional fixed marquee |
| Scroll highlight | `data-motion="scroll-highlight"` | Text element |
| SVG reveal/hover | `data-motion="svg-reveal"` | SVG wrapper |
| Image clip | `data-motion="image-clip"` | Clipping wrapper |
| Parallax | `data-motion="parallax"` | Media wrapper or inner media |
| Magnetic | `data-motion="magnetic"` | Button/link outer hit area |
| Cursor | `data-motion="cursor"` | Pointer area with cursor child |
| Link text swap | `data-motion="link-swap"` | Link/button wrapper |
| Responsive menu | `data-motion="responsive-menu"` | Custom navigation component |
| Loader composition | `data-motion="loader-composition"` | Fixed loader wrapper |
| Page transition | `data-motion="page-transition"` | Site-wide transition wrapper |
| Grid/slider switch | `data-motion="view-switch"` | Collection/list wrapper |\n| Draggable grid | `data-motion="draggable-grid"` | Oversized 2D drag/wheel gallery |\n| Draggable grid detail | `data-motion="draggable-grid-detail"` | Flip-selected grid item into detail panel |
| Looping labels | `data-motion="looping-labels"` | Marquee wrapper |\n| Infinite text distortion | `data-motion="infinite-text-distortion"` | Infinite vertical text column |\n| Infinite media column | `data-motion="infinite-media-column"` | Infinite vertical media rail |
| Stacked cards | `data-motion="stacked-cards"` | Repeated card-list wrapper |
| Sticky section exit | `data-motion="sticky-section-exit"` | Sticky section stack root |
| Stacked-image hover | `data-motion="stacked-image-hover"` | Media stack wrapper |
| Strip/Flip preview | `data-motion="strip-flip-preview"` | Preview system root |
| Circle clip preview | `data-motion="circle-clip-preview"` | Preview system root |
| Rotated cover preview | `data-motion="rotated-cover-preview"` | Preview system root |
| Title roll + media zoom hover | `data-motion="title-roll-media-zoom-hover"` | Preview trigger/card |
| Flip relocation | `data-motion="flip-relocation"` | Section containing items and destinations |
| Pinned media | `data-motion="pinned-media"` | Tall media section |\n| Pinned image depth zoom | `data-motion="pinned-image-depth-zoom"` | Pinned 3D foreground/background composition |
| Pinned steps | `data-motion="pinned-steps"` | Tall story section |
| Accordion/media | `data-motion="accordion-media"` | Component root |
| Theme switch | `data-motion="theme-switch"` | Section that activates a theme |
| Morph narrative | `data-motion="morph-narrative"` | Scroll section containing SVG paths |

Detailed attributes and Webflow hierarchies are documented in `docs/WEBFLOW_INTEGRATION.md`.

## Stationary typography and scroll migration

The 14-module typography family is documented in [docs/stationary-text-library.md](docs/stationary-text-library.md). These modules default to the existing measured auto-alignment planner and supply their real timelines for analysis. Registration still happens in `src/modules/registry.js`; the runtime mounts discovered attributes, while `src/core/scroll-alignment/` owns automatic timing and migration classifications. Specialized scroll modules retain their own geometry contracts.

`npm run check:alignment` includes typography behavior and registry checks as well as scroll geometry and migration tests.

## Optional advanced packages

Eight heavier systems build as separate ES-module entries under `dist/advanced/`: fluid canvas, velocity effects, WebGL work browser, infinite product world, aircraft scroll story, canvas image sequence, cinematic cylinder scroll, and cinematic 3D camera story. They are not included in `motion-kit.js`; Webflow pages load only the package they use. Installation and markup contracts are documented in `docs/ADVANCED_PACKAGES.md`.

## Repository boundary

The research manifests may be committed. Downloaded third-party production bundles under `work/` are ignored and must not be redistributed.
