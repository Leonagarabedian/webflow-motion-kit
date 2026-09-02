# Responsive structural pass

Captured on the public home routes after allowing initial scripts to settle. These are structural observations, not yet dense motion trajectories.

| Site | 1440 × 900 | 768 × 1024 | 390 × 844 | Preliminary breakpoint conclusion |
|---|---|---|---|---|
| Nothin’ | 1 pin spacer; 11,601px document | no pin spacer; 11,529px | no pin spacer; 9,201px | Desktop pin/Flip systems are simplified below 992px. |
| Voyeur Vérité | 4 pin spacers | 3 pin spacers | 3 pin spacers | Mobile/tablet preserve stacked/pinned narratives but use alternate timelines. Body height is owned by the smoother wrapper, so raw document height is not authoritative. |
| Scheme Engine | 2 canvases; 1 pin spacer | same canvas/pin count | same canvas/pin count | WebGL experience remains active across tested widths; geometry and controls adapt. |
| House of Corto | viewport-height body; internal navigation | same | same | Product experience uses fixed/internal scrolling rather than normal document flow. |
| Jesko Jets | no canvas after settled pass; 10,896px | no canvas; 14,444px | no canvas; 10,251px | Desktop-only Globe/advanced branches are disabled below 992px; alternate flight structure appears on smaller screens. |
| a-lign studio | 3 image-sequence canvases; 15,147px | 3 canvases; 12,288px | 3 canvases; 12,032px | Canvas sequences remain present; process/work layouts use breakpoint-specific logic. |

## Limitations

- Smooth-scrolling wrappers make raw `documentElement.scrollHeight` unreliable on Voyeur Vérité and House of Corto.
- Canvas presence only confirms the rendered layer, not its complete animation trajectory.
- Exact scroll start/end positions, transforms and reveal fractions will be sampled for shortlisted high-salience modules before implementation.
