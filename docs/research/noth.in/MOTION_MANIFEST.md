# Nothin’ — implementation motion manifest

Scope: homepage `#works`, sampled 2026-09-02 at 1440 × 900. Evidence labels distinguish browser measurements from recovered public bundle values.

## Signature interaction: WORKS Flip + portfolio parallax

- Trigger interval: `2163.59px → 4413.25px` (`top top` → `bottom bottom`). **Observed**
- Dense sample count: 21 at normalized progress `0, .05 … 1`. **Observed**
- Letters: state 1 → state 2 → state 1. The first letter’s measured x translation was `-1307px → 0px → -1307px`. **Observed**
- Flip tween: `duration: 1.4`, `ease: power4.inOut`, `stagger: { each: .2, from: "end" }`, `repeat: 1`, `yoyo: true`, `scrub: 3`. **Source-extracted**
- Letter pulse: `scale: .2 → 1` during the relocation. **Source-extracted**
- First work card y: `34.49px → 80px`, settling around progress `.45`. The six source offsets are `[80, -150, -100, -160, 100, -90]`; scrub is `1.5`. **Observed + source-extracted**
- First image y: `-121.83px → -173.79px`, settling around progress `.30`; source tween is `yPercent: -5 → -20`, `scrub: 3`. **Observed + source-extracted**
- Image reveal: wrapper clip-path resolves to `inset(0%)`; source duration `1`, ease `power4`, start `top 88%`. **Observed + source-extracted**
- Project cursor: hidden state is opacity `0`, visibility `hidden`, scale `0`; source follow interpolation is `.09`, enter `.6 back.out(1.8)`, exit `.38 power3.in`. **Observed + source-extracted**

### Dense measured curve

| p | letter x | card y | image y |
|---:|---:|---:|---:|
| 0.00 | -1307.00 | 34.49 | -121.83 |
| 0.05 | -1307.00 | 40.07 | -133.59 |
| 0.10 | -1307.00 | 45.76 | -146.50 |
| 0.15 | -1307.00 | 51.40 | -159.33 |
| 0.20 | -1307.00 | 57.09 | -172.23 |
| 0.25 | -1300.11 | 62.73 | -173.73 |
| 0.30 | -1185.11 | 68.37 | -173.79 |
| 0.35 | -560.31 | 74.06 | -173.79 |
| 0.40 | -80.21 | 79.70 | -173.79 |
| 0.45 | -3.02 | 80.00 | -173.79 |
| 0.50 | 0.00 | 80.00 | -173.79 |
| 0.55 | -1.27 | 80.00 | -173.79 |
| 0.60 | -51.35 | 80.00 | -173.79 |
| 0.65 | -423.64 | 80.00 | -173.79 |
| 0.70 | -1129.14 | 80.00 | -173.79 |
| 0.75 | -1294.29 | 80.00 | -173.79 |
| 0.80 | -1306.96 | 80.00 | -173.79 |
| 0.85 | -1307.00 | 80.00 | -173.79 |
| 0.90 | -1307.00 | 80.00 | -173.79 |
| 0.95 | -1307.00 | 80.00 | -173.79 |
| 1.00 | -1307.00 | 80.00 | -173.79 |

## Responsive branch

- 768 × 1024 and 390 × 844: no pin spacer; `.works-word-block-state2` has zero rendered size; work cards have no GSAP transform. **Observed**
- Implementation rule: initialize the Flip/letter composition only above the desktop breakpoint; retain static list, text reveals and image presentation below it. **Inferred from observed branch + source structure**

## Module boundary

Use three cooperating modules: `flip-relocation`, `work-card-parallax`, and `media-cursor`. They share the section but must own independent timelines and cleanup.
