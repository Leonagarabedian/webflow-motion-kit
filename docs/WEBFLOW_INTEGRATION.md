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
