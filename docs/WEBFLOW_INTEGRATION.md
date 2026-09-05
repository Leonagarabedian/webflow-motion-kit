# Webflow integration contract

## Shared motion tokens

MotionKit accepts both raw values and shared token aliases. Use tokens when you want different sections to share the same motion language.

- Duration: `instant`, `fast`, `medium`, `standard`, `slow`, `deliberate`, `ambient`
- Easing: `linear`, `gentle`, `standard`, `enter`, `exit`, `smooth`
- Stagger: `tight`, `compact`, `standard`, `relaxed`, `wide`
- Distance: `xs`, `sm`, `md`, `lg`, `reveal`

Example: `data-motion-duration="slow" data-motion-ease="enter" data-motion-stagger="relaxed"`. Numeric values and raw GSAP ease strings continue to work.


## Installation

1. Connect this repository to Netlify.
2. Use build command `npm run build` and publish directory `dist`.
3. Add the generated CSS in Webflow’s site-wide `<head>` custom code.
4. Add the generated JavaScript before `</body>` with `defer`.
5. Publish to the Webflow staging domain and verify there; Designer preview and the published site are different environments.

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

Optional: `data-motion-y`, `data-motion-ease`, `data-motion-once`, and `data-motion-trigger`.

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

Use `data-motion-event="scroll"` for an entrance instead. Optional attributes are `data-motion-duration`, `data-motion-speed`, `data-motion-chars`, `data-motion-restore`, `data-motion-start`, and `data-motion-once`.

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


## Hero frame transition

```html
<section data-motion="hero-frame-transition"
         data-motion-state-class="is-frame-b"
         data-motion-delay="0.25"
         data-motion-frame-duration="1.15"
         data-motion-side-delay="1.15"
         data-motion-side-duration="0.7">
  <div data-motion-target="intro">...</div>
  <div data-motion-target="frame">...</div>
  <div data-motion-target="side-left">...</div>
  <div data-motion-target="side-right">...</div>
</section>
```

Author Frame A as the normal Webflow state and Frame B as a combo/state class, defaulting to `is-frame-b`. MotionKit reads the actual authored Frame B geometry through GSAP Flip, so the module does not hardcode template-specific sizes, positions, or transforms. The frame and intro transition first, followed by the side blocks. Optional attributes: `data-motion-state-class`, `data-motion-min-width`, `data-motion-delay`, `data-motion-frame-duration`, `data-motion-side-delay`, `data-motion-side-duration`, `data-motion-ease`, and `data-motion-side-ease`. On reduced-motion desktop environments, the final authored state is applied without animation. Below the minimum width, the authored responsive state is left untouched.

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
