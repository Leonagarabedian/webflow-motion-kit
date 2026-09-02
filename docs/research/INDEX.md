# Six-site motion research

Status: detailed interaction-sampling gate complete; signature manifests and responsive branches are ready for implementation.

## Sources

- https://www.noth.in/
- https://www.voyeurverite.com/
- https://www.schemeengine.com/
- https://www.houseofcorto.com/
- https://jeskojets.com/
- https://www.a-lign.studio/

## Architecture groups

1. External compiled bundle attached to Webflow: Nothin’, Scheme Engine, House of Corto.
2. Webflow GSAP integration plus inline custom logic: Voyeur Vérité.
3. Webflow plus Slater-hosted custom logic: Jesko Jets, a-lign studio.

All six use Webflow for markup/content. Their advanced motion is driven by custom JavaScript or Webflow-hosted GSAP libraries rather than by GitHub itself.

## Candidate library families

- Text: masked line reveal, word/character reveal, blur reveal, scramble, scroll highlight.
- Media: clip reveal, parallax, pinned scale, image sequence, media crossfade.
- Pointer: custom cursor, magnetic element, mask follow, draggable/inertial surface.
- Navigation: menu reveal, page transition, preloader, theme switching.
- Layout: Flip relocation, sticky cards, pinned narrative, responsive grid choreography.
- Advanced: SVG morph, WebGL carousel, fluid canvas reveal, globe/canvas scene.

## Evidence labels

- **Observed**: verified in the rendered page or DOM.
- **Source-extracted**: verified in public executable source.
- **Inferred**: plausible from structure/source but not yet sampled in motion.
- **Unknown**: requires responsive or interactive follow-up.

## Completed manifests

- `noth.in/MOTION_MANIFEST.md` — Works Flip, card/image parallax, cursor and responsive fallback.
- `voyeurverite.com/MOTION_MANIFEST.md` — pinned history, navigation, SVG morph and responsive geometry.
- `schemeengine.com/MOTION_MANIFEST.md` — fixed WebGL work browser and visual checkpoints.
- `houseofcorto.com/MOTION_MANIFEST.md` — transform world and layered product hover.
- `jeskojets.com/MOTION_MANIFEST.md` — hero zoom, jet handoff, benefits accordion and responsive assets.
- `a-lign.studio/MOTION_MANIFEST.md` — pinned process, compact process branch and image-sequence boundary.
- `DETAILED_INTERACTION_SAMPLING.md` — cross-site coverage and implementation gate.
