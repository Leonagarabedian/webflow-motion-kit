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

## Initial modules

| Module | Webflow attribute | Intended layer |
|---|---|---|
| Line reveal | `data-motion="line-reveal"` | Text element |
| Image clip | `data-motion="image-clip"` | Clipping wrapper |
| Parallax | `data-motion="parallax"` | Media wrapper or inner media |
| Magnetic | `data-motion="magnetic"` | Button/link outer hit area |
| Cursor | `data-motion="cursor"` | Pointer area with cursor child |
| Flip relocation | `data-motion="flip-relocation"` | Section containing items and destinations |
| Pinned steps | `data-motion="pinned-steps"` | Tall story section |
| Accordion/media | `data-motion="accordion-media"` | Component root |

Detailed attributes and Webflow hierarchies are documented in `docs/WEBFLOW_INTEGRATION.md`.

## Repository boundary

The research manifests may be committed. Downloaded third-party production bundles under `work/` are ignored and must not be redistributed.
