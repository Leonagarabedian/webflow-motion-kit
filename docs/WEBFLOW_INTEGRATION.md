# Webflow integration contract

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
