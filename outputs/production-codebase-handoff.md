# Webflow Motion Kit — production codebase handoff

## Created

- Vite library build producing `dist/motion-kit.js` and `dist/motion-kit.css`
- Netlify build and cross-origin delivery configuration
- GSAP 3.15 with ScrollTrigger, Flip and SplitText bundled and registered once
- Idempotent `init`, scoped `destroy`, and `refresh` lifecycle
- Webflow-ready data-attribute API
- Reduced-motion and coarse-pointer fallbacks
- Local demonstration page
- Automated configuration and lifecycle tests
- Research manifests kept in the same repository
- Downloaded third-party bundles excluded by `.gitignore`

## Initial modules

1. Masked line reveal
2. Image clip reveal
3. Inner/element parallax
4. Magnetic element
5. Custom cursor area
6. Flip relocation
7. Responsive pinned steps
8. Accordion synchronized with media

## Verification

- Tests: 2 files passed, 2 tests passed
- Production build: passed
- JavaScript bundle: approximately 154 KB, 58.8 KB gzip
- CSS bundle: under 1 KB
- Public browser API smoke test: `window.WebflowMotionKit.version === "0.1.0"`
- Local browser mount: line splitting, clip initial state and pinned-step structure verified without console errors
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

## Next step

Create the GitHub repository, push this codebase, connect that repository to Netlify, and replace `YOUR-SITE` with the deployed Netlify hostname in Webflow.
