# Stationary typography library

This family has 14 registered `data-motion` modules. The registry discovers behavior; the existing shared `src/core/scroll-alignment/` system owns measured viewport timing. This change does not migrate other modules or replace their specialized crossing-line, dynamic-span, spatial or pin contracts.

## Migration integration

`src/modules/stationary-text-policy.js` declares this family's migration metadata. All 14 default to auto alignment. The audit accepts both `data-motion-alignment` and `data-motion-align`, reports that actual default, and classifies surface effects as safe-auto and font/layout/counter effects as medium-auto. Risk classification indicates visual review needs, not a new global activation rule.

Each module constructs its real GSAP timeline before attaching ScrollTrigger. The automatic planner analyzes its actual timing, child count, element geometry and active breakpoint. It no longer receives a fictitious one-stage timeline. Planned scrub is retained unless an explicit override is supplied. Existing modules retain their existing default alignment modes.

Common attributes:

| Attribute | Meaning |
| --- | --- |
| `data-motion` | Module name. Space-separated behavior tokens remain supported. |
| `data-motion-alignment="auto"` | Default for this family; measure element and analyze actual timeline. |
| `data-motion-align` | Alias for alignment. The full attribute takes precedence. |
| `data-motion-alignment="aligned"` | Use shared explicit anchor, viewport and span configuration. |
| `data-motion-alignment="legacy"` | Use manual start/end. `manual` is also accepted as a fallback mode. |
| `data-motion-trigger` | Optional ancestor or document selector for the measured trigger. |
| `data-motion-alignment-trigger` | Shared alignment trigger selector; can also target a descendant. |
| `data-motion-scrub` | Optional numeric smoothing override. `false` enables a triggered, non-scrubbed timeline. |
| `data-motion-once` | For non-scrubbed timelines only. Default false allows reverse on re-entry. |
| `data-motion-start`, `data-motion-end` | Manual fallback, default `top 85%` / `bottom 25%`. |
| `data-motion-alignment-anchor`, `-viewport`, `-span` | Aligned-mode configuration, default top / 0.7 / 70vh. |
| `data-motion-alignment-id` | Optional diagnostics ID. Otherwise each instance gets a unique ID. |
| `data-motion-ease` | Default `none`, preserving the relationship between scroll and effect progress. |

## Effect contracts

| Module | Intended result and implementation | Attributes |
| --- | --- | --- |
| `inner-letter-space` | Pressure or distortion inside glyph counters. Automatic rendering rasterizes the loaded font, finds enclosed transparent regions and changes only those interiors, preserving outer pixels. No whole-letter scaling fallback. | `data-motion-mode="pressure\|distort"`, `data-motion-amount="0.12"`, `data-motion-counter-scale`, `data-motion-stagger="0.025"` |
| `typography-gap-space` | Letter, word and line space resolves to authored responsive values. This space concept intentionally changes layout. | `data-motion-letter-from`, `data-motion-word-from`, `data-motion-line-factor="1.12"` |
| `section-space` | Padding and flex/grid gaps resolve to independently preserved authored values on every side. This space concept intentionally changes layout. | `data-motion-space-pressure="24"` |
| `architecture-space` | Perimeter bars draw around the root; optional spatial nodes reveal through clipping. | `data-motion-architecture-color`; optional descendants `data-motion-space-node` |
| `stroke-fill` | Outline resolves to fill, or the reverse, on a fixed rich-text surface. Nested spans retain their colors unless explicitly overridden. | `data-motion-direction="fill\|outline"`, `data-motion-fill-color`, `data-motion-stroke-color`, `data-motion-stroke-width="1"` |
| `weight-pressure` | Font weight changes. Split glyph boxes are locked to authored widths and remeasured on refresh. A variable font provides smooth intermediate weights; static fonts may switch discretely. | `data-motion-weight-from`, `data-motion-weight-to`, `data-motion-split="chars\|none"`, `data-motion-stagger="0.018"` |
| `glyph-mask-reveal` | A second color or texture reveals inside fixed, rich glyphs. Horizontal/vertical modes wipe; radial grows a circular clip; custom intersects a supplied CSS mask with the reveal. | `data-motion-mask="horizontal\|vertical\|radial\|custom"`, `data-motion-mask-origin="50% 50%"`, `data-motion-from-color`, `data-motion-to-color`, `data-motion-fill-color`, `data-motion-texture`, `data-motion-custom-mask` |
| `counter-expansion` | Enclosed counters expand from a contracted interior to the original font's actual counter shape. The exterior glyph pixels remain fixed. | `data-motion-counter-scale="0.82"`, `data-motion-stagger="0.025"` |
| `occlusion-blocks` | Block-shaped clips clear across fixed type. Default clips expose the real gradient/video background. Explicit occlusion color enables painted cover bars instead. | `data-motion-blocks="5"`, `data-motion-axis="horizontal\|vertical"`, optional `data-motion-occlusion-color` |
| `emphasis-transfer` | Contrast or weight emphasis advances word by word. Prior word weight is restored as emphasis leaves. Word boxes remain anchored. | `data-motion-mode="contrast\|weight"`, `data-motion-active-color`, `data-motion-inactive-color`, `data-motion-inactive-opacity="0.34"`, `data-motion-active-weight` |
| `slice-fragment-reveal` | Fixed clipped rich-text slices reveal by opacity. Copies preserve spans, line breaks and authored type styles; no fragment translation is applied. | `data-motion-slices="6"`, `data-motion-axis="horizontal\|vertical"`, `data-motion-stagger="0.025"` |
| `negative-space-cutout` | Fill clears to transparency with an outline, exposing the actual underlying background. An explicit cutout color can instead fill the interior. | `data-motion-cutout-color`, `data-motion-stroke-color`, `data-motion-stroke-width="0.75"` |
| `material-shift` | Crossfade between actual rendered surfaces. Grain/matte use SVG noise confined to glyph alpha; glass uses noise refraction and backdrop blur; erosion animates a noise alpha threshold. Fill/outline remain available. | `data-motion-from`, `data-motion-to`: `fill\|outline\|matte\|grain\|glass\|erosion`; `data-motion-grain="0.35"`, `data-motion-stroke-color` |
| `selective-glyph-activation` | Selected glyphs activate via color, opacity and weight; remaining glyphs regain opacity. Generated glyph boxes keep anchored widths. | `data-motion-select="every\|vowels\|counters\|odd\|even"`, `data-motion-every="2"`, `data-motion-glyphs`, `data-motion-active-color`, `data-motion-active-weight`, `data-motion-inactive-opacity="0.42"`, `data-motion-stagger="0.035"` |

Counter modules can instead target explicitly authored `data-motion-counter` descendants, useful for SVG/custom counter geometry. Only these inner targets transform. Automatic raster surfaces require a measurable glyph and Canvas 2D support. Glyphs without enclosed counters remain legible and unchanged. Counter detection uses the actual rendered alpha, rather than an alphabet whitelist. Selection mode `counters` in selective-glyph-activation remains a common counter-bearing character selection rule.

Custom mask accepts a CSS mask-image, or `--motion-custom-mask` on the root. An authored custom mask remains part of the final state. Textures accept any CSS background-image value, including a gradient or `url(...)`; external texture loading follows normal browser resource rules.

`data-motion-fragment-offset` is no longer applied. That attribute produced translated fragments and conflicted with the fixed-type contract. For whole-root `weight-pressure` with `split="none"`, font metrics may reflow naturally; use the default character mode when positions must remain anchored.

## Rendering and lifecycle

Authored DOM, original text nodes, links, event listeners, inline styles and accessible labels are preserved on cleanup. Generated surfaces are inert, hidden from accessibility APIs and stripped of IDs and `data-motion*` attributes, so they cannot recursively mount behaviors. Each effect uses a scoped GSAP context and kills its trigger on teardown. Existing `will-change` is preserved.

Font/viewport refresh updates surface type styles, counter raster geometry and locked glyph/word widths. The gap and section space modules reread authored responsive metrics without feeding animated inline values back into their endpoints. The existing shared runtime/font-ready refresh path remains in charge; no second global scroll runtime is introduced.

Property ownership still matters: do not attach two effects that write the same color, weight, clipping or layout properties on the same root. Use separate authored layers for independent treatments. These fixed surfaces are intended for typography, not containers holding interactive forms, videos or independently animated descendants.

The four space concepts may change layout or perimeter geometry by design. Surface treatments keep their boxes fixed; internal counter/refraction changes occur within that anchored typography.

## Treatment mappings

- Texture pass and second-state reveal: `glyph-mask-reveal` with a texture or from/to colors.
- Contrast shift: `emphasis-transfer` in contrast mode.
- Internal distortion: `inner-letter-space` in distort mode.
- Erosion/dissolve: `material-shift` entering or leaving erosion.
- Matte / grain / glass / outline / fill: `material-shift` presets.
- Radial / horizontal / vertical / custom masks: `glyph-mask-reveal` modes.
- Selective counters / glyphs: automatic counter geometry or authored inner targets, plus `selective-glyph-activation` rules.

## First Webflow visual check

```html
<h1 data-motion="glyph-mask-reveal"
    data-motion-alignment="auto"
    data-motion-mask="radial"
    data-motion-from-color="#232323"
    data-motion-to-color="#fcd5d7">
  BUILDING BRANDS BETWEEN DISCIPLINES
</h1>
```

Omit scrub to evaluate the planner's default before art direction overrides. Confirm type alignment, real font metrics, line wrapping, reversal and gradient/video relationships in Webflow at desktop, tablet and mobile. Function tests do not constitute visual approval. No Webflow publishing is required to prepare this repository change.
