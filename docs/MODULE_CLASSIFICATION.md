# Motion module classification

Status: code-aligned inventory for the current `0.4.2` toolkit.

The category is now stored on each module/package as `category` and is not only documentation.

## Primitive

A behavior that can be attached to a new Webflow element with little or no section-specific structure.

- `line-reveal`
- `text-reveal`
- `blur-reveal`
- `scramble-text`
- `scroll-highlight`
- `svg-reveal`
- `image-clip`
- `parallax`
- `magnetic`
- `cursor`
- `link-swap`
- `looping-labels`
- `theme-switch`
- Advanced: `velocity-effects`

## Component

A reusable interaction that requires a defined DOM contract or coordinated sub-elements.

- `responsive-menu`
- `loader-composition`
- `page-transition`
- `view-switch`
- `stacked-cards`
- `stacked-image-hover`
- `flip-relocation`
- `pinned-media`
- `pinned-steps`
- `accordion-media`
- `morph-narrative`
- Advanced: `fluid-canvas`
- Advanced: `image-sequence`

## Composition

A higher-level experience assembled around a specific interaction model. These should not be treated as generic one-element commands.

- Advanced: `infinite-product-world`
- Advanced: `webgl-work-browser`
- Advanced: `aircraft-scroll-story`

There are currently no main-kit modules classified as compositions. Page-specific Branda animation recipes should be kept outside the primitive registry and should compose primitives/components rather than expanding a composition until it becomes a fake universal API.
