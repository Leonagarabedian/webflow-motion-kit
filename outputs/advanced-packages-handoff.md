# Advanced Webflow motion packages

Version 0.4.0 adds six optional, independently loaded packages:

1. `fluid-canvas.js`
2. `velocity-effects.js`
3. `webgl-work-browser.js`
4. `infinite-product-world.js`
5. `aircraft-scroll-story.js`
6. `image-sequence.js`

## How to use one package

Keep the normal Motion Kit tags if the page uses any of its 23 standard modules. Add the advanced stylesheet once in Webflow’s site `<head>`:

```html
<link rel="stylesheet" href="https://YOUR-SITE.netlify.app/advanced/motion-advanced.css">
```

Before `</body>`, load only the advanced package needed on that page:

```html
<script type="module" src="https://YOUR-SITE.netlify.app/advanced/fluid-canvas.js"></script>
```

Replace `fluid-canvas.js` with another name from the list above. The package loads its own shared files automatically; do not paste the hashed chunk URLs into Webflow.

The exact Webflow custom attributes and markup recipes are documented in `docs/ADVANCED_PACKAGES.md` in the repository. These are reusable behavior engines. Your Webflow images, videos, text, CMS fields and routes provide the final content and art direction.
