# Webflow Motion Kit — production codebase handoff

## Created

- Vite library build producing `dist/motion-kit.js` and `dist/motion-kit.css`
- Netlify build and cross-origin delivery configuration
- GSAP 3.15 with ScrollTrigger, Flip, SplitText and ScrambleText bundled and registered once
- Idempotent `init`, scoped `destroy`, and `refresh` lifecycle
- Webflow-ready data-attribute API
- Reduced-motion and coarse-pointer fallbacks
- Local demonstration page
- Automated configuration and lifecycle tests
- Research manifests kept in the same repository
- Downloaded third-party bundles excluded by `.gitignore`

## Included modules

1. Masked line reveal
2. Word/character rise reveal
3. Blur text reveal
4. Scramble text
5. Scroll-progress text highlight
6. Image clip reveal
7. Inner/element parallax
8. Magnetic element
9. Custom cursor area
10. Duplicate-text link swap
11. Stacked-image hover
12. Flip relocation
13. Pinned media scale
14. Responsive pinned steps
15. Accordion synchronized with media
16. Theme switching

## Verification

- Tests: 3 files passed, 4 tests passed
- Production build: passed
- JavaScript bundle: approximately 172 KB, 64 KB gzip
- CSS bundle: approximately 1.5 KB, 0.5 KB gzip
- Public browser API smoke test target: `window.WebflowMotionKit.version === "0.2.0"`
- Local browser mount: line/word/blur splitting, scroll-highlight state, clip state, sticky media, link swap and stacked-image structure verified without console errors
- Accordion interaction: active item, panel height and `aria-expanded` state verified after click
- Syntax and whitespace checks: passed

## Commands

```bash
pnpm install
pnpm run dev
pnpm run check
```

## Webflow tags after Netlify deployment

```html
<link rel="stylesheet" href="https://YOUR-SITE.netlify.app/motion-kit.css">
<script defer src="https://YOUR-SITE.netlify.app/motion-kit.js"></script>
```

## Deployment

The private GitHub repository is connected to Netlify. Pushes to `main` trigger a production build; replace `YOUR-SITE` with the deployed Netlify hostname in Webflow.
