# a-lign studio evidence

- URL: https://www.a-lign.studio/
- Platform: Webflow.
- **Observed:** loader plus seven major content sections, three canvases, four videos, and an approximately 12,800px document.
- **Source-extracted:** Webflow CDN loads GSAP 3.15 with Flip, ScrollTrigger, Draggable, CustomEase, Inertia, ScrambleText, ScrollTo and SplitText.
- **Source-extracted:** custom readable Slater file at `https://slater.app/20651/62823.js`.
- **Source-extracted:** uses Lenis, Barba, Swiper and explicit page teardown arrays; this is the strongest lifecycle reference in the set.
- **Unknown:** route-specific modules and exact medium/mobile fallbacks require route and viewport sampling.

