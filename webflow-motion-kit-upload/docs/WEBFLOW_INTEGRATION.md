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
