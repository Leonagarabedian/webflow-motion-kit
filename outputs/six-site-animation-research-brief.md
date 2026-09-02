# Six-site animation system — research brief

## Reference websites

1. Nothin’ — https://www.noth.in/
2. Voyeur Vérité — https://www.voyeurverite.com/
3. Scheme Engine — https://www.schemeengine.com/
4. House of Corto — https://www.houseofcorto.com/
5. Jesko Jets — https://jeskojets.com/
6. a-lign studio — https://www.a-lign.studio/

## Confirmed production patterns

- All six use Webflow for structure and content.
- Nothin’, Scheme Engine and House of Corto attach externally hosted compiled JavaScript bundles to Webflow.
- Voyeur Vérité uses Webflow-hosted GSAP plugins plus readable inline custom code.
- Jesko Jets and a-lign use Webflow-hosted libraries plus Slater-hosted custom code.
- GitHub is not what makes the animations run; it stores source. A build/deployment layer produces the public JavaScript that Webflow loads.

## Reusable module shortlist

### Text

- Masked line reveal
- Word/character rise reveal
- Blur reveal
- Text scramble
- Scroll-progress highlight/fill

### Media

- Directional clip reveal
- Inner-image parallax
- Element parallax
- Pinned media scale/zoom
- Image sequence

### Pointer and controls

- Magnetic element
- Custom cursor follower
- Duplicate-text link/button swap
- Accordion synchronized with media
- Responsive menu reveal

### Layout and navigation

- Flip relocation between Webflow containers
- Loader composition
- Page transition adapter
- Theme switching
- Pinned process/step narrative

## Advanced studies kept separate

- Nothin’ fluid pointer reveal and velocity-reactive glitch section
- Scheme Engine WebGL work browser
- Voyeur Vérité stacked masked narratives and MorphSVG history
- Jesko Jets aircraft/globe scroll compositions
- a-lign image sequences and process compositions

## Chosen architecture

```text
Webflow markup and CMS
        ↓
data-motion attributes
        ↓
Reusable GSAP registry and lifecycle
        ↓
Vite production bundle
        ↓
Netlify public assets
        ↑
GitHub source repository
```

The production bundle will own its GSAP version and plugins. Each module will have an explicit Webflow hierarchy, data attributes, defaults, responsive behavior, reduced-motion fallback and cleanup function.

## Current status

- Public source and runtime libraries inventoried for all six sites.
- Desktop, tablet and mobile structural passes completed.
- Detailed signature manifests completed for all six sites.
- Dense desktop sampling completed for Noth Works (21 points), Voyeur history (21), Jesko hero/aircraft (42) and a-lign process (21).
- Input-path and canvas systems captured through visual checkpoints, live interaction sweeps and source inspection.
- Responsive branch behavior confirmed, including Noth’s static fallback and a-lign’s compact process rows.
- The interaction-sampling gate is complete; production scaffold and reusable-module implementation can begin.
