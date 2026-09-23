# Advanced optional packages

These packages reproduce the sampled interaction models with original code and placeholder/CMS-fed media. They do not include or redistribute source-site artwork, photography, video, copy, shaders or models.

## Installation

Add the shared advanced stylesheet once on any Webflow page that uses an advanced package:

```html
<link rel="stylesheet" href="https://leonagarabedian.github.io/webflow-motion-kit/advanced/motion-advanced.css?v=MAIN_SHA">
```

Then load only the package used by that page, before `</body>`:

```html
<script type="module" src="https://leonagarabedian.github.io/webflow-motion-kit/advanced/fluid-canvas.js?v=MAIN_SHA"></script>
```

Use the current short `main` SHA for `MAIN_SHA` when cache busting after a deploy. Advanced packages stay page-scoped rather than joining the site-wide `motion-kit.js`.

Available entry files:

- `fluid-canvas.js`
- `velocity-effects.js`
- `webgl-work-browser.js`
- `infinite-product-world.js`
- `aircraft-scroll-story.js`
- `image-sequence.js`
- `cinematic-cylinder-scroll.js`
- `cinematic-3d-camera-story.js`

The ES-module entries automatically fetch their hashed shared chunks. Do not copy the hashed chunk URLs into Webflow.

## Fluid canvas

```html
<section data-advanced="fluid-canvas"
         data-advanced-color-a="#5940ff"
         data-advanced-color-b="#bdff00"
         data-advanced-intensity="0.035">
  <img data-advanced-target="source" src="YOUR-WEBFLOW-CDN-IMAGE" alt="">
</section>
```

The image is optional; without it, the shader renders a configurable gradient. The WebGL canvas responds to pointer position and local scroll velocity, pauses off-screen, caps device-pixel ratio, resizes with its section, and disposes GPU resources on destroy. Give the section an explicit height. Ensure external image hosts allow CORS; Webflow CDN images normally do.

## Velocity effects

```html
<div data-advanced="velocity-effects"
     data-advanced-strength="28"
     data-advanced-skew="7">
  <div data-advanced-velocity-layer>Primary layer</div>
  <div data-advanced-velocity-layer aria-hidden="true">Color echo</div>
  <div data-advanced-velocity-layer aria-hidden="true">Second echo</div>
</div>
```

Put the echo layers in separate absolute wrappers. Each layer receives an alternating velocity displacement and skew, then settles to its original state. Do not put another transform interaction on these same layer elements.

## WebGL work browser

```html
<section data-advanced="webgl-work-browser" style="min-height: 500vh">
  <div data-advanced-target="viewport"></div>

  <article data-advanced-work-item
           data-advanced-category="identity"
           data-advanced-href="/work/project-one">
    <img src="YOUR-CMS-IMAGE" alt="Project placeholder">
  </article>
  <article data-advanced-work-item data-advanced-category="digital">...</article>

  <button data-advanced-filter="all">All</button>
  <button data-advanced-filter="identity">Identity</button>
</section>
```

CMS items provide media, category and destination data while WebGL planes provide the presentation. Scroll controls the inertial camera, filtering relayouts visible planes, clicking a plane follows its configured route, and mobile uses centered smaller planes. Videos that are already ready become `VideoTexture`s; images become color-managed textures; missing media receives an original fallback color.

## Infinite product world

```html
<section data-advanced="infinite-product-world"
         data-advanced-capture-wheel="true">
  <div data-advanced-target="world">
    <div data-advanced-target="world-group">
      <!-- Your Webflow product grid, at least viewport-sized -->
    </div>
  </div>
</section>
```

The package creates eight accessibility-hidden copies around the original group, wraps the world in both axes, and supports wheel, pointer and touch dragging with inertia. The clones are removed on cleanup. Use `data-advanced-capture-wheel="false"` when the world sits inside a normally scrolling page rather than a dedicated viewport experience.

## Aircraft scroll story

```html
<section data-advanced="aircraft-scroll-story">
  <div data-advanced-target="sticky">
    <img data-advanced-target="hero-background" alt="">
    <h2 data-advanced-target="hero-left">PRIVATE</h2>
    <h2 data-advanced-target="hero-right">FLIGHT</h2>
    <img data-advanced-target="aircraft" alt="">
    <img data-advanced-target="blueprint" alt="">
    <div data-advanced-target="globe">...</div>
    <div data-advanced-target="spec">Specification</div>
  </div>
</section>
```

The desktop timeline first enlarges the hero background and separates the title, then scales the aircraft toward `0.4`, introduces the blueprint, rotates in the globe and staggers specifications. Below `992px` and for reduced motion, the package leaves the Webflow-authored static/mobile layout intact. Use nested wrappers if any layer also needs hover motion.

## Image sequence

Webflow image elements can provide frames:

```html
<section data-advanced="image-sequence" style="min-height: 400vh">
  <div data-advanced-target="sticky">
    <canvas data-advanced-target="canvas"></canvas>
    <div data-advanced-sequence-stage>Stage one</div>
    <div data-advanced-sequence-stage>Stage two</div>
  </div>
  <img data-advanced-frame src="FRAME-001" alt="">
  <img data-advanced-frame src="FRAME-002" alt="">
</section>
```

Or use a numbered URL pattern:

```html
<section data-advanced="image-sequence"
         data-advanced-src="/frames/frame-{index}.webp"
         data-advanced-frame-count="120"
         data-advanced-frame-start="1"
         data-advanced-frame-pad="3">
  <div data-advanced-target="sticky"></div>
</section>
```

Frames preload asynchronously and the nearest available frame renders while loading continues. Canvas drawing uses a centered cover crop and capped DPR. Scroll progress selects frames; stage overlays activate in equal timeline segments. Use optimized WebP/AVIF sequences, keep total transfer size deliberate, and host frames with CORS enabled.


## Cinematic cylinder scroll

This package adapts the Codrops cinematic cylinder idea to the existing MotionKit Three.js layer, without React, OGL, or a second ScrollSmoother.

```html
<section data-advanced="cinematic-cylinder-scroll" style="min-height: 500svh">
  <div data-advanced-target="viewport">
    <div data-advanced-target="chapter">...</div>
    <div data-advanced-target="chapter">...</div>
  </div>

  <img data-advanced-cylinder-image src="YOUR-WEBFLOW-CDN-IMAGE" alt="">
  <img data-advanced-cylinder-image src="YOUR-WEBFLOW-CDN-IMAGE" alt="">

  <div data-advanced-cylinder-shot
       data-advanced-camera-x="0"
       data-advanced-camera-y="0"
       data-advanced-camera-z="8"
       data-advanced-duration="1"
       data-advanced-ease="mkCinematicSilk"></div>

  <div data-advanced-cylinder-shot
       data-advanced-camera-x="0.5"
       data-advanced-camera-y="0"
       data-advanced-camera-z="0.8"
       data-advanced-duration="3.5"
       data-advanced-ease="power1.inOut"></div>
</section>
```

The package builds one image atlas from the supplied Webflow images, maps it around an open Three.js cylinder, rotates that cylinder across the scroll range, and drives the camera through authored shot nodes. Chapter targets fade in and out across equal scroll segments unless they define `data-advanced-chapter-start` and `data-advanced-chapter-end`. Reactive line particles increase opacity from rotational velocity and settle as rotation slows.

Useful root controls include `data-advanced-cylinder-radius`, `data-advanced-cylinder-height`, `data-advanced-rotations`, `data-advanced-darkness`, `data-advanced-particle-count`, `data-advanced-particle-radius`, `data-advanced-particle-color`, `data-advanced-fov`, `data-advanced-dpr`, `data-advanced-scrub`, `data-advanced-start`, and `data-advanced-end`. If no images are supplied, the package renders an original generated placeholder atlas so the motion can still be tested.

## Cinematic 3D camera story

This package turns a Webflow-authored list of camera shots into a scroll-directed Three.js scene.

```html
<section data-advanced="cinematic-3d-camera-story" style="min-height: 900svh"
         data-advanced-model-src="YOUR-MODEL.glb">
  <div data-advanced-target="viewport">
    <div data-advanced-target="chapter">
      <h2 data-advanced-target="chapter-title">DISCOVER</h2>
      <p data-advanced-target="chapter-subtitle">The future of architecture</p>
    </div>

    <div data-advanced-target="progress-bar"></div>
    <span data-advanced-target="progress-text">000%</span>
  </div>

  <div data-advanced-scene-shot
       data-advanced-start-progress="0"
       data-advanced-end-progress="12"
       data-advanced-camera-x="0"
       data-advanced-camera-y="2"
       data-advanced-camera-z="10"
       data-advanced-target-x="0"
       data-advanced-target-y="5"
       data-advanced-target-z="0"></div>
</section>
```

Each `data-advanced-scene-shot` defines one percentage range, camera position, and look-at target. Matching chapter targets use SplitText character entrances/exits over the same ranges. Progress targets are optional. When `data-advanced-model-src` points to a GLB/GLTF asset, the package loads it with Three.js; without a model it renders an original geometric architecture placeholder for testing. Root controls include model transform, fog, scene/background colors, light intensities, camera clipping planes, DPR, scroll scrub, and text scrub/stagger.

Unlike the original Codrops demo, neither cinematic package creates its own ScrollSmoother. It intentionally uses the page's existing scroll environment and only owns its local ScrollTriggers.

## Voyeur Vérité-style pinned narrative

This study does not need another heavy package. Compose the existing main-kit modules:

```text
pinned-steps + morph-narrative + theme-switch
```

This preserves the reusable pinned panels, path morphing and section/theme handoff without duplicating GSAP or shipping a separate engine.

## Production boundary

The packages are behavior-complete engines with placeholder input contracts. Visual fidelity for a particular client project still depends on its approved media, path geometry, models, copy, section heights and art direction. Source-site fidelity is not claimed until those inputs are integrated and a synchronized source-versus-rebuild QA pass is performed.
