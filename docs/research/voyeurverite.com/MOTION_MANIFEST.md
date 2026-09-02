# Voyeur Vérité — implementation motion manifest

Scope: homepage history narrative, sampled 2026-09-02.

## Signature interaction: pinned history with SVG morph

- Desktop trigger container: `.history_steps_wrapper`, `8495.19px → 29555.19px`, height `21960px`. **Observed**
- Dense sample count: 21 at `0, .05 … 1`. **Observed**
- The visual layer remains viewport-pinned while its generated transform advances approximately linearly from `0px` to `20990px`. **Observed**
- Each step occupies one viewport-height panel (`900px` desktop, `1024px` tablet, `844px` mobile). **Observed**
- The implementation synchronizes step activation, progress-navigation fills, SVG mask/path morphing, image opacity and the conclusion handoff. **Source-extracted**
- First history image is fully visible at entry and inactive by the first `.05` sample; later images take over. **Observed**
- The final visual enlarges from `900px` square to about `1454.4px` square near progress `.95–1`. **Observed**

### Key measured states

| p | scroll y | pinned transform y | first-image opacity | SVG width |
|---:|---:|---:|---:|---:|
| 0.00 | 7964 | 0 | 1 | 900 |
| 0.05 | 9449 | 953.94 | 0 | 900 |
| 0.25 | 13690 | 5194.98 | 0 | 900 |
| 0.50 | 18955 | 10460.00 | 0 | 900 |
| 0.75 | 24220 | 15725.00 | 0 | 900 |
| 0.90 | 27379 | 18884.00 | 0 | 900 |
| 0.95 | 28432 | 19937.00 | 0 | 1454.4 |
| 1.00 | 29485 | 20990.00 | 0 | 1454.4 |

## Responsive branch

- 768 × 1024: history wrapper `7400.80px → 31361.80px`; pinned visual is `768 × 1025`; navigation remains active then fades at exit. **Observed**
- 390 × 844: history wrapper `6157.20px → 25907.20px`; pinned visual is `390 × 845`; the same narrative model remains active. **Observed**
- Desktop uses ScrollSmoother; raw `scrollY` can lag the logical trigger position during programmatic sampling. Trigger geometry and computed transforms are authoritative here. **Observed limitation**

## Module boundary

Implement as `pinned-steps` plus an optional `svg-morph-adapter`. Content, masks and path pairs are configuration. The conclusion/footer handoff stays page-specific.
