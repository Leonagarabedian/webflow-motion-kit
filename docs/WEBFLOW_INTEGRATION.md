# Webflow integration contract

## Shared motion tokens

MotionKit accepts both raw values and shared token aliases. Use tokens when you want different sections to share the same motion language.

- Duration: `instant`, `fast`, `medium`, `standard`, `slow`, `deliberate`, `ambient`
- Easing: `linear`, `gentle`, `standard`, `enter`, `exit`, `smooth`
- Stagger: `tight`, `compact`, `standard`, `relaxed`, `wide`
- Distance: `xs`, `sm`, `md`, `lg`, `reveal`

Example: `data-motion-duration="slow" data-motion-ease="enter" data-motion-stagger="relaxed"`. Numeric values and raw GSAP ease strings continue to work.


## Installation

1. Merge or push the desired MotionKit changes to `main`.
2. GitHub Actions runs `.github/workflows/deploy-pages.yml`, validates the alignment suite, builds `dist`, and deploys it to GitHub Pages.
3. Load the production stylesheet site-wide in Webflow from `https://leonagarabedian.github.io/webflow-motion-kit/motion-kit.css`.
4. Load the production script site-wide before `</body>` from `https://leonagarabedian.github.io/webflow-motion-kit/motion-kit.js` with `defer`.
5. Append `?v=<short-main-sha>` to both asset URLs after a new deploy when a cache-busting version is needed.
6. Do not add page-level copies of the MotionKit bundle. Pages should supply their authored Webflow structure and `data-motion` attributes while the single site-wide GitHub Pages bundle owns the animation logic.
7. Publish to the Webflow staging domain and verify there; Designer preview and the published site are different environments.

## Attribute rules

- `data-motion` selects one or more modules. Space-separated values are allowed.
- `data-motion-target` identifies the structural layer owned by a module.
- Configuration attributes stay on the module root.
- Give scroll, hover and pointer motion different nested layers when they animate the same kind of transform.

## Line reveal

```html
<h2 data-motion="line-reveal"
    data-motion-start="top 85%"
    data-motion-duration="1"
    data-motion-stagger="0.08">
  Your heading
</h2>
```

Optional: `data-motion-y`, `data-motion-y-px`, `data-motion-x-px`, `data-motion-delay`, `data-motion-ease`, `data-motion-once`, and `data-motion-trigger`. Use `data-motion-x-px` with `data-motion-y-px="0"` for a horizontal line entrance while preserving the same masked line-reveal module.

## Word, character, and blur reveals

```html
<h2 data-motion="text-reveal" data-motion-split="words">
  Reveal each word through a mask.
</h2>

<p data-motion="blur-reveal"
   data-motion-split="lines"
   data-motion-blur="12">
  Resolve soft text into focus.
</p>
```

For `text-reveal`, `data-motion-split` accepts `lines`, `words`, or `chars`; the default is `words`. For `blur-reveal`, the default is `lines`. Both accept duration, stagger, start, ease, and vertical-distance attributes. SplitText restores the original markup when the module is destroyed.

## Scramble text

```html
<a data-motion="scramble-text"
   data-motion-text="VIEW PROJECT"
   data-motion-event="hover">
  EXPLORE
</a>
```

Use `data-motion-event="scroll"` for an entrance instead. Add `data-motion-on-enter-back="true"` when the text should scramble again as it re-enters while scrolling upward; that automatically disables one-shot behavior for that instance. Optional attributes are `data-motion-duration`, `data-motion-speed`, `data-motion-chars`, `data-motion-restore`, `data-motion-start`, `data-motion-once`, and `data-motion-on-enter-back`.

## Scroll text position Flip

This module adapts the core typography motion from Codrops' MIT-licensed [ScrollTextMotion](https://github.com/codrops/ScrollTextMotion) demo. It does **not** hardcode the original `pos-1` through `pos-10` classes. Instead, Webflow authors any two classes and the module measures the real layouts with GSAP Flip.

```html
<div class="motion-copy state-a"
     data-motion="scroll-text-position-flip scramble-text"
     data-motion-source-class="state-a"
     data-motion-alt-class="state-b"
     data-motion-event="scroll"
     data-motion-on-enter-back="true">
  Neural glow
</div>
```

The source class is optional. When `data-motion-source-class` is present, the module temporarily removes it and applies the alternate class while capturing the end state, then restores the authored source state before the page paints. When source classes are omitted, the alternate class behaves like a modifier layered onto the existing authored classes.

Because the end state is a real CSS/Webflow class, **any combination is possible**: horizontal relocation, vertical relocation, diagonals, opacity changes, blur/filter changes, width changes, or combinations of those properties. The original Codrops 19 position pairings are therefore reproducible without becoming 19 separate modules.

The source-faithful legacy timing is two reversible scrubbed Flip phases:

```text
bottom at 90% viewport → center at 50% viewport
source state           → alternate state

center at 50% viewport → top at 0% viewport
alternate state        → source state
```

Default attributes:

- `data-motion-flip-ease="expo.inOut"`
- `data-motion-flip-props="opacity,filter,width"`
- `data-motion-enter-start="clamp(bottom bottom-=10%)"`
- `data-motion-enter-end="clamp(center center)"`
- `data-motion-return-start="clamp(center center)"`
- `data-motion-return-end="clamp(top top)"`
- `data-motion-scrub="true"`
- `data-motion-min-width="0"`

Use `data-motion-alignment="auto"` to replace the string ranges with measured viewport geometry while preserving the same two-phase visual contract. Legacy mode remains source-faithful and the four phase range attributes can be overridden independently.

For the Codrops-style scramble layer, combine the same element with `scramble-text`:

```html
<div class="motion-copy state-a"
     data-motion="scroll-text-position-flip scramble-text"
     data-motion-source-class="state-a"
     data-motion-alt-class="state-b"
     data-motion-event="scroll"
     data-motion-duration="1"
     data-motion-on-enter-back="true">
  Signal
</div>
```

The position Flip and scramble modules remain independent: the Flip module owns layout/transform/opacity/filter state while `scramble-text` owns text content.

## Rotating 3D scroll gallery

This composition adapts Variation 2 of Codrops' MIT-licensed [Rotating On-Scroll Animations](https://github.com/codrops/RotatingOnScrollAnimations). Each authored media item rotates through 3D as it crosses the viewport, recedes on the Z axis near the middle of its scroll range, and returns toward the camera as it exits. The item wrappers are offset horizontally along a sine path. An optional fixed marquee can travel across the viewport over the gallery's full scroll range.

```html
<section data-motion="rotating-3d-scroll-gallery"
         data-motion-amplitude="0.2"
         data-motion-angle-step="0.45"
         data-motion-perspective="900"
         data-motion-depth="-300">
  <div data-motion-target="rotate-wrap">
    <img data-motion-target="rotate-item" src="..." alt="">
  </div>

  <div data-motion-target="rotate-wrap">
    <img data-motion-target="rotate-item" src="..." alt="">
  </div>

  <div data-motion-target="gallery-marquee">
    <div data-motion-target="gallery-marquee-track">
      Project One / Project Two / Project Three
    </div>
  </div>
</section>
```

`rotate-wrap` and its nested `rotate-item` are the reusable pair. The wrapper owns the horizontal sine offset and perspective; the media item owns `rotationX`, `rotationY`, `rotationZ`, and `z`. Keep those transforms on separate Webflow layers so layout and 3D motion do not fight.

The source-faithful defaults are:

- horizontal amplitude: `20vw` via `data-motion-amplitude="0.2"`
- angle step: `0.45`
- perspective: `900px`
- X rotation: random `240deg → 290deg`, animated to its negative
- Y rotation: random `-20deg → 20deg`, animated to its negative
- Z rotation: random `-50deg → 50deg`, animated to its negative
- depth peak: `-300px`
- depth curve: `sin(progress × π)^4`
- item range: `top bottom+=20%` → `bottom top-=20%`
- marquee range: `top bottom` → `bottom top`

Optional root attributes:

- `data-motion-amplitude`
- `data-motion-angle-step`
- `data-motion-perspective`
- `data-motion-rotation-x-min`
- `data-motion-rotation-x-max`
- `data-motion-rotation-y-min`
- `data-motion-rotation-y-max`
- `data-motion-rotation-z-min`
- `data-motion-rotation-z-max`
- `data-motion-depth`
- `data-motion-depth-power`
- `data-motion-start`
- `data-motion-end`
- `data-motion-marquee-start`
- `data-motion-marquee-end`
- `data-motion-min-width`

Use `data-motion-alignment="auto"` for measured viewport geometry. Legacy/manual mode preserves the Codrops ScrollTrigger strings exactly. The marquee targets are optional; omit them when only the rotating gallery is wanted.

Do not add the Codrops Lenis initialization to Webflow. Motion Kit uses the site's existing scroll environment, so this module only owns the visual transforms and ScrollTriggers.

## Scroll-progress highlight

```html
<p data-motion="scroll-highlight"
   data-motion-split="words"
   data-motion-opacity-from="0.2"
   data-motion-start="top 75%"
   data-motion-end="bottom 35%">
  Each word resolves as the paragraph travels through the viewport.
</p>
```

Add `data-motion-inactive-color` and `data-motion-active-color` to interpolate color as well as opacity.

## SVG draw reveal and elastic hover

```html
<div data-motion="svg-reveal" data-motion-hover="true">
  <svg data-motion-target="svg-hover" viewBox="0 0 100 100">
    <path data-motion-target="svg-path"
          d="M10 50 L90 50"
          fill="none"
          stroke="currentColor" />
  </svg>
</div>
```

The paths must have a visible stroke. Mark explicit paths with `data-motion-target="svg-path"`; otherwise the module uses all supported stroke shapes inside the wrapper. Optional attributes include duration, stagger, start, ease, hover scale, hover rotation, and hover duration.

## Image clip with independent parallax

```html
<div data-motion="image-clip parallax"
     data-motion-from="-5"
     data-motion-to="-20"
     data-motion-scrub="1.5">
  <div data-motion-target="clip">
    <img data-motion-target="parallax" alt="">
  </div>
</div>
```

The clip wrapper owns `clip-path`; the inner image owns `transform`. Do not apply a CSS transition to either animated property.

## Magnetic element

```html
<a data-motion="magnetic" data-motion-strength="0.25" data-motion-max="40">
  <span data-motion-target="magnetic">Contact</span>
</a>
```

It automatically disables on coarse pointers and reduced-motion devices.

## Duplicate-text link swap

```html
<a data-motion="link-swap" href="/work">
  <span data-motion-target="primary">View work</span>
  <span data-motion-target="secondary" aria-hidden="true">View work</span>
</a>
```

The wrapper clips both labels. The module disables on coarse pointers and reduced motion; the link remains fully usable.

## Responsive menu

```html
<nav data-motion="responsive-menu" data-motion-lock-scroll="true">
  <button data-motion-target="menu-toggle">Menu</button>
  <div data-motion-target="menu-panel">
    <a data-motion-target="menu-item" href="/work">Work</a>
    <a data-motion-target="menu-item" href="/about">About</a>
  </div>
</nav>
```

Use this with a custom navigation component, not Webflow's built-in Navbar interaction. The module manages `aria-expanded`, `aria-hidden`, Escape-to-close, body scroll locking, link closing, and reversal. Optional attributes: `data-motion-duration`, `data-motion-stagger`, `data-motion-ease`, `data-motion-lock-scroll`, and `data-motion-close-on-link`.

## Loader composition

```html
<div data-motion="loader-composition">
  <div data-motion-target="loader-panel">
    <div data-motion-target="loader-item">Studio name</div>
    <div class="loader-line">
      <div data-motion-target="loader-progress"></div>
    </div>
  </div>
</div>
```

Place the loader once near the top of the page. It plays after window load, then hides itself without removing the Webflow element. Configure item, progress and exit durations independently. Reduced-motion visitors skip the composition.

## Page-transition adapter

```html
<div data-motion="page-transition" aria-hidden="true">
  <div data-motion-target="transition-panel"></div>
</div>
```

Place one instance on every participating page, preferably in a Webflow component. It animates the panel away on entry and over the page before eligible same-origin navigation. External links, downloads, new-tab links, modifier clicks, and same-page anchors are ignored. Add `data-motion-no-transition` to any link that should bypass it. This adapter lets Webflow perform navigation; it is not an SPA router.

## Draggable grid

Use `draggable-grid` for an oversized two-dimensional gallery that can be dragged in X/Y and navigated with wheel input. This module adapts the navigation layer from Joffrey Spitzer / Codrops' MIT-licensed Smooth, Draggable Product Grid demo. Product selection/details are intentionally **not** part of this module; that is a separate interaction layer.

```html
<section data-motion="draggable-grid"
         data-motion-wheel="true"
         data-motion-wheel-strength="7"
         data-motion-inertia="true">
  <div data-motion-target="drag-grid">

    <div data-motion-target="drag-column">
      <div data-motion-target="drag-item"><img src="..." alt=""></div>
      <div data-motion-target="drag-item"><img src="..." alt=""></div>
    </div>

    <div data-motion-target="drag-column">
      <div data-motion-target="drag-item"><img src="..." alt=""></div>
      <div data-motion-target="drag-item"><img src="..." alt=""></div>
    </div>

  </div>
</section>
```

Required contract:

- root: `data-motion="draggable-grid"`
- grid: `data-motion-target="drag-grid"`
- items: one or more `data-motion-target="drag-item"`
- columns are layout-only; `data-motion-target="drag-column"` is recommended for a readable Webflow Navigator but is not required by the runtime

Author the oversized grid layout in Webflow. The root should have an explicit viewport-like height and clip overflow. The grid itself should size to its content (`width: max-content; height: max-content` works well) and can use any column count/gaps/item sizes you want.

Behavior:

- centers the oversized grid initially
- GSAP Draggable owns X/Y pointer dragging
- source-style inertia and edge resistance
- wheel input moves the same X/Y transform
- movement is clamped to measured grid/root bounds
- wheel events are prevented only when the grid can actually move in the requested direction; at a boundary, native page scrolling is released
- bounds recalculate on resize
- optional randomized intro: grid starts at `.5`, items start at `.5` + opacity `0`, then resolve to full scale/opacity
- optional IntersectionObserver fades/scales items as they leave or re-enter the grid viewport

Controls:

- `data-motion-wheel="true|false"`
- `data-motion-wheel-strength="7"`
- `data-motion-wheel-duration="0.3"`
- `data-motion-wheel-ease="power3.out"`
- `data-motion-inertia="true|false"`
- `data-motion-edge-resistance="0.9"`
- `data-motion-overscan-x="200"`
- `data-motion-overscan-y="100"`
- `data-motion-intro="true|false"`
- `data-motion-intro-grid-scale="0.5"`
- `data-motion-intro-item-scale="0.5"`
- `data-motion-intro-item-duration="0.6"`
- `data-motion-intro-stagger-amount="1.2"`
- `data-motion-intro-grid-duration="1.2"`
- `data-motion-observe-items="true|false"`
- `data-motion-item-hidden-scale="0.5"`
- `data-motion-item-hidden-opacity="0"`
- `data-motion-item-visible-duration="0.5"`
- `data-motion-min-width`

Reduced-motion visitors skip the randomized intro and viewport fade/scale effects, while the direct navigation interaction remains available.

## Draggable grid detail

Use `draggable-grid-detail` together with `draggable-grid` when a selected grid item should Flip into a detail panel. The navigation grid and the detail transition stay as separate modules so their transforms never compete.

```html
<section data-motion="draggable-grid draggable-grid-detail">

  <div data-motion-target="detail-grid-shell">
    <div data-motion-target="drag-grid">

      <div data-grid-item="project-1"
           data-motion-target="drag-item">
        <img data-motion-target="detail-media" src="..." alt="">
      </div>

    </div>
  </div>

  <aside data-motion-target="detail-panel" aria-hidden="true">
    <button data-motion-target="detail-close">Close</button>

    <div data-motion-target="detail-thumb"></div>

    <article data-grid-detail="project-1">
      <h2 data-motion-target="detail-title">Project One</h2>
      <p data-motion-target="detail-text">...</p>
    </article>
  </aside>

</section>
```

Required contract:

- root: `data-motion="draggable-grid draggable-grid-detail"`
- independent grid-shift layer: `data-motion-target="detail-grid-shell"`
- grid items: `data-grid-item="<key>"`
- movable image/media inside each item: `data-motion-target="detail-media"` is recommended; otherwise the first `img`, `picture`, or `video` inside the keyed item is used
- panel: `data-motion-target="detail-panel"`
- Flip destination: `data-motion-target="detail-thumb"`
- matching detail content: `data-grid-detail="<same key>"`
- optional close controls: `data-motion-target="detail-close"`

The selected media element is moved, not the outer drag item. That leaves the grid item's authored footprint in place while the exact media object Flips into the detail thumbnail. Keys are matched by value, never by DOM position, so repeated grid items can point to the same detail record.

The detail module animates `detail-grid-shell`, not `drag-grid`. This is deliberate: `draggable-grid` keeps sole ownership of the drag grid's X/Y transform while the detail module shifts the independent shell left as the panel enters.

Default choreography follows the source demo:

- detail duration: `1.2s`
- ease: `power3.inOut`
- grid shell shift: `-50%`
- panel: `xPercent 100 → 0`
- selected media: GSAP Flip into `detail-thumb`
- title: SplitText character reveal
- body: SplitText line reveal
- text delay: `0.4s`
- close delay: `0.3s`
- close reverses the Flip and restores the exact media element to its original parent and DOM position
- Escape closes the panel
- underlying drag/wheel interaction is blocked while detail mode is open

Controls:

- `data-motion-detail-duration="1.2"`
- `data-motion-detail-ease="power3.inOut"`
- `data-motion-detail-close-delay="0.3"`
- `data-motion-detail-shift-percent="-50"`
- `data-motion-detail-text-delay="0.4"`
- `data-motion-detail-title-duration="1.1"`
- `data-motion-detail-title-stagger="0.025"`
- `data-motion-detail-text-duration="1.1"`
- `data-motion-detail-text-stagger="0.05"`
- `data-motion-detail-close-text-duration="0.6"`
- `data-motion-detail-close-on-backdrop="true|false"`

Reduced-motion visitors keep the same selection/detail behavior but skip the travel/reveal durations.

## Pinned image depth zoom

Use `pinned-image-depth-zoom` for the GreenSock-style pinned 3D zoom where a foreground media layer advances toward the viewer while an optional background layer scales more gently.

```html
<section data-motion="pinned-image-depth-zoom"
         data-motion-alignment="auto"
         data-motion-perspective="500"
         data-motion-media-scale="2"
         data-motion-z="350"
         data-motion-background-scale="1.1"
         data-motion-scroll-vh="150">
  <div data-motion-target="background">...</div>

  <div data-motion-target="depth-frame">
    <img data-motion-target="depth-media" src="..." alt="">
  </div>
</section>
```

Required contract:

- root: `data-motion="pinned-image-depth-zoom"`
- depth frame: `data-motion-target="depth-frame"`
- media: `data-motion-target="depth-media"`
- background: optional `data-motion-target="background"`

Author the layout in Webflow. For a source-faithful composition, make the root and both visual layers one viewport tall, position the depth frame over the background, and clip overflow on the depth frame. The module supplies the 3D perspective and animation state, but does not force those layout rules.

Source-faithful defaults:

- perspective: `500px`
- media scale: `1 → 2`
- media Z: `0 → 350px`
- background scale: `1 → 1.1`
- scroll span: `150vh`
- easing: `power1.inOut`
- pinned: true
- scrub: true

Controls:

- `data-motion-perspective`
- `data-motion-media-scale`
- `data-motion-z`
- `data-motion-background-scale`
- `data-motion-scroll-vh`
- `data-motion-ease`
- `data-motion-pin="true|false"`
- `data-motion-min-width`
- `data-motion-alignment="auto"`

Legacy mode keeps the source-style `start: "top top"` and `end: "+=150%"` contract, while the existing standard scroll attributes can override start/end/scrub. Auto mode uses the same top-to-top start with a measured viewport-based range from `data-motion-scroll-vh`. Reduced-motion visitors keep the authored static composition.

## Grid/slider view switch

```html
<section data-motion="view-switch" data-motion-default-view="grid">
  <button data-motion-view="grid">Grid</button>
  <button data-motion-view="slider">Slider</button>
  <div class="work-list">
    <article data-motion-target="view-item">...</article>
    <article data-motion-target="view-item">...</article>
  </div>
</section>
```

Create Webflow styles for `.is-grid` and `.is-slider` on the component root; the module toggles those classes and uses Flip to animate the items between the two layouts. Buttons receive `aria-pressed`. Keep item DOM order identical in both views.

## Infinite text distortion

Use `infinite-text-distortion` for a continuously recycling vertical text column whose individual rendered lines drift horizontally in a sine/cosine field. The module is adapted from Jorge Toloza's MIT-licensed Infinite Scrolling Text Organic Distortion demo, but it does **not** create a second smooth-scroll engine or prevent normal Webflow/page scrolling.

```html
<div data-motion="infinite-text-distortion"
     data-motion-direction="up"
     data-motion-wave="sin"
     data-motion-auto-speed="0.5"
     data-motion-distortion="15"
     data-motion-velocity-distortion="5">
  <div data-motion-target="distortion-track">
    <p data-motion-target="distortion-item">First authored paragraph...</p>
    <p data-motion-target="distortion-item">Second authored paragraph...</p>
  </div>
</div>
```

Required contract:

- root: `data-motion="infinite-text-distortion"`
- track: `data-motion-target="distortion-track"`
- items: direct children of the track; mark them with `data-motion-target="distortion-item"` when the track contains other children

Author the root with an explicit height and the width/layout you want in Webflow. The module supplies `overflow: hidden` at runtime, clones enough authored items to keep the loop filled, splits each item into responsive visual lines with GSAP SplitText, and restores the authored DOM on cleanup/rebuild.

For the source-style opposing pair, use two independent roots:

```html
<div data-motion="infinite-text-distortion"
     data-motion-direction="up"
     data-motion-wave="sin">...</div>

<div data-motion="infinite-text-distortion"
     data-motion-direction="down"
     data-motion-wave="cos">...</div>
```

The loop has a small continuous auto-drift and also reacts to passive wheel/touch input while visible. It never calls `preventDefault()`, creates Lenis, creates ScrollSmoother, or owns page scroll.

Controls:

- `data-motion-direction="up|down"`
- `data-motion-wave="sin|cos"`
- `data-motion-auto-speed="0.5"`
- `data-motion-ease-factor="0.05"`
- `data-motion-speed-ease="0.05"`
- `data-motion-wheel-strength="0.254"`
- `data-motion-touch-strength="1"`
- `data-motion-distortion="15"`
- `data-motion-velocity-distortion="5"`
- `data-motion-phase-speed="0.0007"`
- `data-motion-min-cycles="2"`

Reduced-motion visitors keep the authored static text.

## Infinite media column

Use `infinite-media-column` for the independent center media rail from the same Jorge Toloza demo. It continuously recycles authored media items vertically and reacts lightly to wheel/touch input without creating a second page scroller.

```html
<div data-motion="infinite-media-column"
     data-motion-direction="down"
     data-motion-auto-speed="0.2"
     data-motion-wheel-strength="0.054">
  <div data-motion-target="media-track">
    <img data-motion-target="media-item" src="..." alt="">
    <img data-motion-target="media-item" src="..." alt="">
    <img data-motion-target="media-item" src="..." alt="">
  </div>
</div>
```

Required contract:

- root: `data-motion="infinite-media-column"`
- track: `data-motion-target="media-track"`
- items: direct children of the track; use `data-motion-target="media-item"` when other direct children are present

The root should have an authored height and `overflow` can remain unset; the module applies `overflow: hidden` at runtime. Each media item keeps its authored width/aspect ratio. The module clones enough items to maintain an infinite loop and removes those clones on cleanup.

The source demo's media rail moves continuously at a gentler rate than the text columns. Defaults preserve that relationship:

- `data-motion-auto-speed="0.2"`
- `data-motion-wheel-strength="0.054"`
- `data-motion-ease-factor="0.05"`
- `data-motion-speed-ease="0.05"`

Additional controls:

- `data-motion-direction="up|down"`
- `data-motion-touch-strength="0.35"`
- `data-motion-min-cycles="2"`
- `data-motion-min-width`

For the Branda Motion Kit reference, the media rail uses the same tighter response tuning as the approved text test (`ease-factor="0.12"`, `speed-ease="0.12"`) while keeping the original slower media auto-speed and lighter wheel influence.

Like `infinite-text-distortion`, this module never calls `preventDefault()`, creates Lenis, or creates another ScrollSmoother.

## Looping labels

```html
<div data-motion="looping-labels"
     data-motion-duration="18"
     data-motion-pause-hover="true">
  <div data-motion-target="loop-track">
    <div data-motion-target="loop-group">
      <span>Strategy</span><span>Design</span><span>Development</span>
    </div>
  </div>
</div>
```

The module duplicates the group once, removes duplicate IDs and interactive tab stops, then loops the track continuously. Use `data-motion-direction="right"` to reverse direction. It pauses while off-screen and restores a single original group on cleanup.



## Circle clip preview

Use `circle-clip-preview` for the Codrops circular reveal. Trigger and preview keys pair exactly like the Strip module.

```html
<section data-motion="circle-clip-preview">
  <article data-motion="title-roll-media-zoom-hover"
           data-motion-preview-trigger="project-1">
    <span data-motion-target="title-inner">PROJECT</span>
    <button data-motion-target="media">
      <span data-motion-target="media-image"></span>
    </button>
  </article>

  <div data-motion-target="preview-overlay"></div>

  <div data-motion-target="preview-layer" aria-hidden="true">
    <section data-motion-preview="project-1">
      <div data-motion-target="preview-image"></div>
      <h2 data-motion-target="preview-title">PROJECT</h2>
      <div data-motion-target="preview-box">...</div>
      <div data-motion-target="preview-box">...</div>
    </section>
  </div>

  <button data-motion-target="preview-back">Back</button>
</section>
```

Author the circular overlay as the Codrops geometry: fixed, centered, circular, and approximately `150vmax × 150vmax`. The module animates its scale, expands the active preview's `clip-path` from `0vmax` to `60vmax`, scales the selected trigger media to `1.2`, resolves the preview image from `.8` to `1`, resolves the title from `1.6` to `1`, and brings preview boxes in from opposite horizontal offsets.

Optional controls: `data-motion-duration`, `data-motion-ease`, `data-motion-preview-delay`, `data-motion-clip-duration`, `data-motion-clip-ease`, `data-motion-close-clip-duration`, and `data-motion-circle-radius`.

## Rotated cover preview

Use `rotated-cover-preview` for the diagonal sweeping cover from the Codrops Rotated demo.

```html
<section data-motion="rotated-cover-preview">
  <article data-motion="title-roll-media-zoom-hover"
           data-motion-preview-trigger="project-1">
    <span data-motion-target="title-inner">PROJECT</span>
    <button data-motion-target="media">
      <span data-motion-target="media-image"></span>
    </button>
  </article>

  <div class="authored-rotated-overlay">
    <div data-motion-target="preview-overlay-inner"></div>
  </div>

  <div data-motion-target="preview-layer" aria-hidden="true">
    <section data-motion-preview="project-1">
      <div data-motion-target="preview-media-wrap">
        <div data-motion-target="preview-image"></div>
      </div>
      <span data-motion-target="slide-text">PROJECT</span>
      <p data-motion-target="description">...</p>
    </section>
  </div>

  <button data-motion-target="preview-back">Back</button>
</section>
```

Author the outer cover in Webflow as the Codrops geometry: fixed, centered, approximately `150vmax × 150vmax`, rotated `45deg`, and clipping its inner field. The module moves only `preview-overlay-inner` from `-100%` to `0`, then unreveals the preview media with opposing horizontal transforms. The outer rotation remains purely authored layout.

Optional controls: `data-motion-duration`, `data-motion-ease`, `data-motion-preview-delay`, `data-motion-stagger`, and `data-motion-close-duration`.

## Strip / Flip preview

Use `strip-flip-preview` for the Codrops-style preview handoff where the selected card media physically relocates into a fullscreen preview with GSAP Flip.

### Required Webflow hierarchy

```html
<div data-motion="strip-flip-preview">
  <article data-motion="title-roll-media-zoom-hover"
           data-motion-preview-trigger="project-1">
    <div class="overflow-hidden">
      <span data-motion-target="title-inner">PROJECT 1</span>
    </div>

    <button data-motion-target="media">
      <span data-motion-target="media-image"></span>
    </button>

    <div data-motion-target="caption">01 / CATEGORY</div>
  </article>

  <article data-motion="title-roll-media-zoom-hover"
           data-motion-preview-trigger="project-2">
    ...
  </article>

  <div data-motion-target="preview-overlay"></div>

  <div data-motion-target="preview-layer" aria-hidden="true">
    <section data-motion-preview="project-1">
      <div data-motion-target="preview-media"></div>

      <div class="overflow-hidden">
        <span data-motion-target="slide-text">PROJECT 1</span>
      </div>

      <p data-motion-target="description">...</p>
    </section>

    <section data-motion-preview="project-2">
      ...
    </section>
  </div>

  <button data-motion-target="preview-back">Back</button>
</div>
```

The trigger key and preview key must match exactly:

```text
data-motion-preview-trigger="project-1"
data-motion-preview="project-1"
```

The module never pairs previews by DOM position. This is deliberate so CMS items can use stable slug-like keys.

Required roles on every trigger are `title-inner`, `media`, and `caption`. The preview with the matching key must contain `preview-media`. `slide-text` and `description` are optional and may appear more than once.

The tested default choreography matches the Codrops Strip demo:

- base duration `0.8`
- base ease `power4.inOut`
- strip expansion handoff at `0.6s`
- preview text duration `1.1`
- preview text ease `expo`
- text reveal delay `0.3s`
- alternating strip origin based on trigger index
- media reparenting through GSAP Flip
- Escape and Back both close the preview
- focus returns to the original media trigger

Optional controls on the root: `data-motion-duration`, `data-motion-ease`, `data-motion-content-delay`, `data-motion-text-duration`, `data-motion-text-ease`, `data-motion-text-delay`, and `data-motion-description-offset`.

Author the visual layout in Webflow. The module owns animation state, media relocation, pointer/focus state, and cleanup. The `preview-media` element must have the final size/aspect ratio you want the selected media to occupy.

## Title roll + media zoom hover

This module is intentionally separate from the preview transition so the hover can be reused without the fullscreen preview.

```html
<article data-motion="title-roll-media-zoom-hover">
  <div class="overflow-hidden">
    <span data-motion-target="title-inner">PROJECT</span>
  </div>

  <button data-motion-target="media">
    <span data-motion-target="media-image"></span>
  </button>
</article>
```

Defaults preserve the Codrops interaction: title rolls out at `-100%` with `-4deg` rotation and `6px` blur, re-enters from `100%` with `4deg` rotation and blur, the media wrapper scales to `.95`, and the inner image scales to `1.2`.

Optional controls: `data-motion-duration`, `data-motion-ease`, `data-motion-title-exit-duration`, `data-motion-title-exit-ease`, `data-motion-title-rotation`, `data-motion-title-blur`, `data-motion-media-scale`, and `data-motion-image-scale`.

## Stacked-image hover

```html
<a data-motion="stacked-image-hover"
   data-motion-scales="1,.45,.2,.08">
  <img data-motion-target="stack-layer" alt="">
  <img data-motion-target="stack-layer" alt="">
  <img data-motion-target="stack-layer" alt="">
</a>
```

Layers are paired in DOM order. Give the wrapper an explicit height or aspect ratio. Use `data-motion-duration`, `data-motion-stagger`, and `data-motion-ease` to tune the choreography.

## Stacked cards

```html
<div data-motion="stacked-cards"
     data-motion-stack-top="8vh"
     data-motion-stack-offset="12"
     data-motion-stack-overlap="10"
     data-motion-min-width="992">
  <article data-motion-stack-card>...</article>
  <article data-motion-stack-card>...</article>
  <article data-motion-stack-card>...</article>
</div>
```

Each card stays in normal document flow, becomes sticky at its configured top, and layers beneath the cards that follow it. `data-motion-stack-overlap="10"` starts the next card after roughly 90% of the previous card's measured height has passed. `data-motion-stack-offset` is a pixel increment that leaves a small visible edge between stacked cards; use `0` for exact overlap. The module recalculates overlap when card dimensions change, then restores the authored layout below the minimum width and for reduced-motion visitors. Keep overflow visible on ancestors of the stack.

## Sticky section exit

Use one root for the entire stack. Every animated panel is a normal Webflow element marked with `data-motion-sticky-section`. The module supplies the sticky positioning and exit choreography at runtime.

```html
<div data-motion="sticky-section-exit"
     data-motion-sticky-variant="image-drift"
     data-motion-alignment="auto">
  <section data-motion-sticky-section>
    <img data-motion-target="media" alt="">
    <h2 data-motion-target="title">Panel one</h2>
    <p data-motion-target="text">...</p>
  </section>

  <section data-motion-sticky-section>
    <img data-motion-target="media" alt="">
    <h2 data-motion-target="title">Panel two</h2>
    <p data-motion-target="text">...</p>
  </section>
</div>
```

Required contract:

- root: `data-motion="sticky-section-exit"`
- repeated panels: `data-motion-sticky-section`

Optional targets are `data-motion-target="media"`, `title`, `text`, and `inner`. When target attributes are omitted, the module falls back to common `img/video/picture`, heading, and paragraph elements. `perspective-fold` works best with an explicit `inner` wrapper so the sticky panel itself does not own the 3D fold transform.

The 15 Codrops-inspired variants are exposed through one stable contract:

| Original demo | Variant |
|---|---|
| 1 | `image-drift` |
| 2 | `rounded-dim` |
| 3 | `center-collapse` |
| 4 | `corner-collapse` |
| 5 | `hinge-collapse` |
| 6 | `perspective-fold` |
| 7 | `fade-shrink` |
| 8 | `blur-shrink` |
| 9 | `media-rise` |
| 10 | `slide-up` |
| 11 | `tilt-fade` |
| 12 | `contrast-drift` |
| 13 | `side-throw` |
| 14 | `vertical-squash` |
| 15 | `media-sweep` |

Numeric aliases `1` through `15` are also accepted.

The Codrops-faithful collapse variants are now the default behavior for demos 3, 4, 5 and 14:

- `center-collapse`
- `corner-collapse`
- `hinge-collapse`
- `vertical-squash`

For those four variants, the module reproduces the source geometry directly: every panel stays in normal document flow, becomes `position: sticky`, uses an exact sticky-panel height, starts at `top top`, scrubs directly, and runs for exactly one measured panel height. The panel transform therefore resolves over the same distance that the following sibling travels into the viewport. With the source transform origins, that is what keeps the outgoing and incoming panel edges visually connected.

The previous Motion Kit interpretation is still available explicitly as:

- `center-collapse-detached`
- `corner-collapse-detached`
- `hinge-collapse-detached`
- `vertical-squash-detached`

The detached variants keep the earlier independent/floating runway and do not force the exact panel box.

For faithful collapse variants, the default panel height is `calc(100vh - top)`. Override it with `data-motion-sticky-panel-height` when required. If an explicit `data-motion-target="inner"` exists, it is fit to `height: 100%` / `min-height: 0` so authored inner content does not make the sticky box taller than the animation geometry.

`data-motion-sticky-contact="true"` remains accepted as a backward-compatible override for older references, but it is no longer required for the primary collapse variants.

General controls: `data-motion-sticky-top`, `data-motion-sticky-min-height`, `data-motion-sticky-panel-height`, `data-motion-sticky-scrub`, `data-motion-min-width`, `data-motion-alignment="auto"`, and the shared manual `data-motion-start`, `data-motion-end`, `data-motion-scroll-distance`, `data-motion-scroll-vh`, and `data-motion-scrub` overrides.

`side-throw` now finishes with a short dedicated fade phase; tune the final alpha with `data-motion-sticky-exit-opacity`.

Variant motion amounts can be tuned with attributes such as `data-motion-sticky-scale`, `data-motion-sticky-y`, `data-motion-sticky-x`, `data-motion-sticky-rotation`, `data-motion-sticky-radius`, `data-motion-sticky-brightness`, `data-motion-sticky-contrast`, `data-motion-sticky-opacity`, `data-motion-sticky-blur`, and the corresponding `media/title/text` controls used by the more complex variants.

The module intentionally does not create Lenis or another smooth-scroll instance. It uses the site's existing scroll environment and the Motion Kit ScrollTrigger/alignment system.

## Custom cursor area

```html
<a data-motion="cursor">
  <img alt="">
  <div data-motion-target="cursor">Explore</div>
</a>
```

The cursor target must be a descendant of the hit area. The stylesheet supplies absolute positioning and disables pointer events.

## Flip relocation

```html
<section data-motion="flip-relocation" data-motion-min-width="992">
  <div class="start-slots">
    <div><span data-flip-item>W</span></div>
    <div><span data-flip-item>O</span></div>
  </div>
  <div class="end-slots">
    <div data-flip-target></div>
    <div data-flip-target></div>
  </div>
</section>
```

Items and targets are paired in DOM order. Default behavior is the sampled Noth-style journey: `1.4s`, `power4.inOut`, stagger `.2` from the end, repeat once, yoyo, scroll scrub `3`. It is disabled below `992px` and for reduced motion.


## Section field

Use `section-field` when the visual background plane of a composition must expand or compress independently from its content. The module never moves the source content. It clips a dedicated full-size field from the measured source geometry to the full field bounds, or reverses that relationship for compression.

```html
<section data-motion="section-field"
         data-motion-field-mode="expand"
         data-motion-field-axis="both"
         data-motion-field-progress-start="0"
         data-motion-field-progress-end="0.5"
         data-motion-scroll-vh="100"
         data-motion-scrub="1">
  <div class="section-field-layer" data-motion-target="section-field"></div>
  <div class="founder-panel" data-motion-target="section-field-source">...</div>
  <div class="founder-image">...</div>
</section>
```

The `section-field` target should already occupy the full visual bounds you want at the end of expansion, typically the composition or viewport-sized section. The `section-field-source` target is only measured, never transformed. This avoids FLIP reflow, detached proxy surfaces, and content movement.

Controls: `data-motion-field-mode="expand|compress"`, `data-motion-field-axis="both|x|y"`, `data-motion-field-progress-start`, `data-motion-field-progress-end`, `data-motion-min-width`, `data-motion-start`, `data-motion-scroll-vh`, `data-motion-scrub`, and `data-motion-pin`.

For staged handoffs, finish the field expansion before starting a separate transform owner such as `scroll-travel` on an image wrapper. Keep the background clip and image transform on different elements.

## Field takeover

```html
<section data-motion="field-takeover"
         data-motion-state-class="is-field-takeover"
         data-motion-min-width="992"
         data-motion-scroll-vh="100"
         data-motion-scrub="1"
         data-motion-pin="true">
  <div data-motion-target="takeover-field">
    <div data-motion-target="takeover-content">...</div>
  </div>
</section>
```

Author the start geometry in Webflow as the normal state. Author the takeover geometry with the state/combo class named by `data-motion-state-class`, which defaults to `is-field-takeover`. The module captures the authored start state, applies the takeover class, and uses GSAP Flip to scrub only the field geometry between those two states. It does not hardcode colors, dimensions, section names, or About-page selectors.

The optional `takeover-content` target has independent transform ownership. By default it begins retiring after 35% progress and finishes by 85%. Configure that with `data-motion-content-start`, `data-motion-content-end`, `data-motion-content-opacity-to`, and `data-motion-content-y`. Use a nested wrapper when the field contains content that should move independently from the field's Flip transform.

Useful controls are `data-motion-state-class`, `data-motion-min-width`, `data-motion-start`, `data-motion-scroll-vh`, `data-motion-scroll-distance`, `data-motion-end`, `data-motion-scrub`, and `data-motion-pin`. `data-motion-alignment="auto"` replaces the authored runway with a geometry-derived range while preserving the same motion. Manual `end` takes priority over scroll distance and viewport-height distance through the shared scroll contract. The composition reverses continuously with scroll. Reduced-motion and sub-minimum-width layouts remain in the authored start state.

The takeover class should describe geometry only where practical. For a full-field takeover, a typical authored state makes the field cover its root using absolute positioning and inset edges. The root must provide the intended spatial context. Visual styling remains in Webflow so the same module can be reused for dark fields, color fields, media panels, or other authored surfaces.

## Hero frame transition

```html
<section data-motion="hero-frame-transition"
         data-motion-state-class="is-frame-b"
         data-motion-scroll-vh="250"
         data-motion-scrub="1"
         data-motion-shrink-end="0.55"
         data-motion-rotate-start="0.55"
         data-motion-rotate-end="0.75"
         data-motion-sides-start="0.65"
         data-motion-sides-end="1">
  <div data-motion-target="intro">...</div>
  <div data-motion-target="frame">...</div>
  <div data-motion-target="side-left">...</div>
  <div data-motion-target="side-right">...</div>
</section>
```

This is a scroll-scrubbed composition, not a page-load animation. Frame A is the normal authored Webflow state at scroll progress `0`; Frame B is the combo/state class, defaulting to `is-frame-b`. The module follows the Voyeur Vérité interaction model: one pinned ScrollTrigger owns the scroll runway and an `onUpdate` handler maps normalized scroll progress into manual phases. There is no animation timeline. GSAP Flip is used only to derive reusable A → B interpolators from the authored Webflow states, so template-specific sizes, positions, and transforms stay in Webflow. The frame/intro shrinks first while staying unrotated. Rotation begins only after the authored shrink phase completes, and the side blocks can enter on their own overlapping phase. Scrolling upward reverses every phase continuously.

Useful controls: `data-motion-state-class`, `data-motion-min-width`, `data-motion-scroll-vh` (default `250`, meaning 2.5 viewport heights for this shortened Frame A → Frame B excerpt), `data-motion-scrub` (default `1`), `data-motion-start` (default `top top`), `data-motion-shrink-end` (default `.55`), `data-motion-rotate-start` (default `.55`), `data-motion-rotate-end` (default `.75`), `data-motion-sides-start` (default `.65`), and `data-motion-sides-end` (default `1`). The full Voyeur Vérité reference pins for five viewport heights because it contains additional phases after this excerpt. Reduced-motion and sub-minimum-width layouts remain in their authored state with no scrub animation.

## Pinned media scale

```html
<section data-motion="pinned-media"
         data-motion-scale-from="0.8"
         data-motion-scale-to="1">
  <div data-motion-target="sticky">
    <img data-motion-target="media" alt="">
  </div>
</section>
```

Make the outer section taller than the viewport, for example `min-height: 180vh`. The sticky wrapper remains one viewport tall. Set `data-motion-pin="true"` only when CSS sticky is unsuitable; do not combine both pinning methods for the same layout.

## Pinned steps

```html
<section data-motion="pinned-steps">
  <div data-motion-target="sticky">
    <article data-motion-step>Step one</article>
    <article data-motion-step>Step two</article>
    <article data-motion-step>Step three</article>
  </div>
</section>
```

Make the section tall enough to provide the intended travel; a useful starting point is one viewport per step. The supplied CSS makes the viewport sticky and panels absolute on desktop, then restores normal flow below `992px`.

## Accordion synchronized with media

```html
<section data-motion="accordion-media">
  <article data-motion-accordion-item data-motion-active>
    <button data-motion-accordion-trigger>Title</button>
    <div data-motion-accordion-panel>Description</div>
  </article>
  <article data-motion-accordion-item>...</article>

  <div class="media-stack">
    <div data-motion-media>...</div>
    <div data-motion-media>...</div>
  </div>
</section>
```

Accordion items and media are paired in DOM order. Use real buttons so keyboard interaction works without extra scripting.

## Theme switch

```html
<section data-motion="theme-switch"
         data-motion-theme-target="body"
         data-motion-background="#f0eadf"
         data-motion-color="#171717">
  ...
</section>
```

You may use `data-motion-theme-class` instead of colors. The theme is active while the trigger crosses the configured start/end range and returns to the computed original colors outside it.

## MorphSVG narrative

```html
<section data-motion="morph-narrative"
         data-motion-start="top top"
         data-motion-end="bottom bottom">
  <svg viewBox="0 0 100 100">
    <path data-motion-target="morph-source" d="M10,10 ... Z"></path>
    <path data-motion-morph-shape d="M20,5 ... Z"></path>
    <path data-motion-morph-shape d="M5,20 ... Z"></path>
  </svg>
</section>
```

The source path morphs through each hidden shape in DOM order as scroll advances. Give the section enough height for the story. Optional attributes: scrub, start, end, `data-motion-morph-type="linear|rotational"`, and `data-motion-morph-map="size|position|complexity"`. Test custom path pairs carefully because source geometry determines whether a morph twists or remains smooth.

## Lifecycle events

For CMS injection or page-transition systems, dispatch these optional events:

```js
window.dispatchEvent(new CustomEvent("motion:destroy", { detail: { root: oldContainer } }));
window.dispatchEvent(new CustomEvent("motion:init", { detail: { root: newContainer } }));
window.dispatchEvent(new Event("motion:refresh"));
```

Initialization is idempotent: running it twice does not mount duplicate listeners or ScrollTriggers.

## Validation checklist

- Confirm every module selector has the expected match count.
- Test start, middle, end and reverse-scroll states.
- Test hover enter and leave after scrolling.
- Check desktop, tablet and mobile branches in a fresh published preview.
- Enable OS reduced motion and confirm essential content remains visible.
- Verify outgoing page containers are destroyed before removal.


## Section replacement

Use `section-replacement` when the next section should replace the current viewport in place instead of physically sliding over it. The outgoing section is pinned only for the replacement span. MotionKit creates an aria-hidden visual proxy of the incoming target, keeps that proxy fixed in its final authored position, and moves only a bottom-to-top clip boundary. At the end of the span the proxy disappears and the real Webflow layout continues in normal flow.

```html
<section class="team-section"
         data-motion="section-replacement"
         data-motion-replacement-from=".mission-section"
         data-motion-replacement-target=".team-hero"
         data-motion-alignment="auto"
         data-motion-replacement-min-width="992"
         data-motion-replacement-scrub="1">
  <div class="team-hero">...</div>
  <div class="team-body">...</div>
  <div data-motion="media-room">...</div>
</section>
```

Only the element selected by `data-motion-replacement-target` is cloned into the transition proxy. Sibling content, later section body content, and modules such as `media-room` remain outside the replacement animation. The default legacy range is `top bottom` to `top top`, which corresponds to one viewport of travel for a normal adjacent section. `data-motion-alignment="auto"` derives the same runway from viewport geometry. Generic `data-motion-start`, `data-motion-end`, `data-motion-scroll-distance`, `data-motion-scroll-vh`, and `data-motion-scrub` overrides continue to work through the shared scroll contract.

Useful module-specific controls are `data-motion-replacement-from`, `data-motion-replacement-target`, `data-motion-replacement-start`, `data-motion-replacement-end`, `data-motion-replacement-scrub`, `data-motion-replacement-ease`, `data-motion-replacement-z-index`, `data-motion-replacement-top`, and `data-motion-replacement-min-width`.
