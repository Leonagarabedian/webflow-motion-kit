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

## Webflow installation

After Netlify deploys the repository, add these tags to Webflow’s site-wide custom code:

```html
<link rel="stylesheet" href="https://YOUR-SITE.netlify.app/motion-kit.css">
<script defer src="https://YOUR-SITE.netlify.app/motion-kit.js"></script>
```

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
| Scramble text | `data-motion="scramble-text"` | Text or link element |
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
| Grid/slider switch | `data-motion="view-switch"` | Collection/list wrapper |
| Looping labels | `data-motion="looping-labels"` | Marquee wrapper |
| Stacked cards | `data-motion="stacked-cards"` | Repeated card-list wrapper |
| Stacked-image hover | `data-motion="stacked-image-hover"` | Media stack wrapper |
| Flip relocation | `data-motion="flip-relocation"` | Section containing items and destinations |
| Pinned media | `data-motion="pinned-media"` | Tall media section |
| Pinned steps | `data-motion="pinned-steps"` | Tall story section |
| Accordion/media | `data-motion="accordion-media"` | Component root |
| Theme switch | `data-motion="theme-switch"` | Section that activates a theme |
| Morph narrative | `data-motion="morph-narrative"` | Scroll section containing SVG paths |

Detailed attributes and Webflow hierarchies are documented in `docs/WEBFLOW_INTEGRATION.md`.

## Optional advanced packages

Six heavier systems build as separate ES-module entries under `dist/advanced/`: fluid canvas, velocity effects, WebGL work browser, infinite product world, aircraft scroll story, and canvas image sequence. They are not included in `motion-kit.js`; Webflow pages load only the package they use. Installation and markup contracts are documented in `docs/ADVANCED_PACKAGES.md`.

## Repository boundary

The research manifests may be committed. Downloaded third-party production bundles under `work/` are ignored and must not be redistributed.
