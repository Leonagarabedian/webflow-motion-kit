# Stationary / non-movement typography library

All modules use `data-motion="<module>"`. New modules default to the shared auto-alignment system. Both `data-motion-alignment="auto"` and the shorthand `data-motion-align="auto"` are accepted.

Common attributes:

- `data-motion-scrub="0.65"` controls scroll smoothing.
- `data-motion-ease="power2.out"` controls easing.
- `data-motion-start` / `data-motion-end` are legacy/manual fallbacks.
- `data-motion-trigger=".selector"` points to a different trigger.
- `data-motion-alignment-id` overrides the diagnostics/alignment id.

## Modules

### inner-letter-space
`data-motion="inner-letter-space"`

Internal optical pressure while text stays anchored. `data-motion-mode="pressure|distort"`, `data-motion-amount="0.12"`. For precise custom counters, add `data-motion-counter` to authored inner glyph/counter targets.

### typography-gap-space
`data-motion="typography-gap-space"`

Animates negative space between letters/words/lines. Attributes: `data-motion-letter-from`, `data-motion-word-from`, `data-motion-line-factor`.

### section-space
`data-motion="section-space"`

Animates the section's empty space through padding and grid/flex gaps. Attribute: `data-motion-space-pressure="24"`.

### architecture-space
`data-motion="architecture-space"`

Draws an architectural perimeter and can reveal authored spatial nodes. Optional children: `data-motion-space-node`. Attribute: `data-motion-architecture-color`.

### stroke-fill
`data-motion="stroke-fill"`

Outline to fill (or fill to outline). Attributes: `data-motion-direction="fill|outline"`, `data-motion-fill-color`, `data-motion-stroke-color`, `data-motion-stroke-width`.

### weight-pressure
`data-motion="weight-pressure"`

Variable-weight pressure with stationary glyph positions. Attributes: `data-motion-weight-from`, `data-motion-weight-to`, `data-motion-split="chars|none"`, `data-motion-stagger`.

### glyph-mask-reveal
`data-motion="glyph-mask-reveal"`

A mask/texture passes through fixed glyphs. Attributes: `data-motion-mask="horizontal|vertical|radial|custom"`, `data-motion-from-color`, `data-motion-to-color`, `data-motion-texture`. `data-motion-texture` accepts any valid CSS background-image value, including `url(...)` or a gradient. Custom mode can use `--motion-custom-mask`.

This module preserves the texture-pass and second-state reveal family.

### counter-expansion
`data-motion="counter-expansion"`

Activates letter counters. Attributes: `data-motion-counter-scale`, `data-motion-stagger`. Add explicit `data-motion-counter` descendants for authored counter geometry; otherwise the module selects common counter-bearing characters.

### occlusion-blocks
`data-motion="occlusion-blocks"`

Editorial masks clear across fixed type. Attributes: `data-motion-blocks`, `data-motion-axis="horizontal|vertical"`, `data-motion-occlusion-color`.

### emphasis-transfer
`data-motion="emphasis-transfer"`

Transfers emphasis word-by-word without translation. Attributes: `data-motion-mode="contrast|weight"`, `data-motion-active-color`, `data-motion-inactive-color`, `data-motion-inactive-opacity`, `data-motion-active-weight`.

This module preserves contrast-shift.

### slice-fragment-reveal
`data-motion="slice-fragment-reveal"`

Fragmented slices resolve into the stationary text. Attributes: `data-motion-slices`, `data-motion-axis`, `data-motion-fragment-offset`.

### negative-space-cutout
`data-motion="negative-space-cutout"`

Transitions the text toward the surrounding section color to create a carved/cutout relationship. Attributes: `data-motion-cutout-color`, `data-motion-stroke-color`, `data-motion-stroke-width`.

### material-shift
`data-motion="material-shift"`

Changes treatment without moving the typography. `data-motion-from` and `data-motion-to` accept `fill`, `outline`, `matte`, `grain`, `glass`, `erosion`. Also supports `data-motion-grain` and `data-motion-stroke-color`.

This module preserves matte/grain/glass/outline/fill and erosion/dissolve treatment states.

### selective-glyph-activation
`data-motion="selective-glyph-activation"`

Activates selected glyphs while the word remains composed. `data-motion-select="every|vowels|counters|odd|even"`, `data-motion-every`, `data-motion-glyphs`, `data-motion-active-color`, `data-motion-active-weight`, `data-motion-inactive-opacity`.

## Treatment mapping

- texture pass -> `glyph-mask-reveal` + `data-motion-texture`
- contrast shift -> `emphasis-transfer` + `data-motion-mode="contrast"`
- internal distortion -> `inner-letter-space` + `data-motion-mode="distort"`
- erosion/dissolve -> `material-shift` using the `erosion` state
- matte/grain/glass/outline/fill -> `material-shift`
- radial/horizontal/vertical/custom masks -> `glyph-mask-reveal`
- selective counters/glyph parts -> `counter-expansion`, `inner-letter-space`, or `selective-glyph-activation`
- second-state text/surface reveals -> `glyph-mask-reveal` using from/to colors or custom texture

## Example

```html
<h1
  data-motion="glyph-mask-reveal"
  data-motion-align="auto"
  data-motion-mask="radial"
  data-motion-from-color="#232323"
  data-motion-to-color="#fcd5d7"
  data-motion-scrub="0.65"
>
  BUILDING BRANDS BETWEEN DISCIPLINES
</h1>
```

Modules are deliberately class-agnostic: they should be applied through attributes rather than hard-coded Webflow class names.
