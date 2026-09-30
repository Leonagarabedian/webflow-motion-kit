# Reusable Sticky Media Transition — frozen Webflow baseline

This file records the known-good Webflow proof before the motion-kit module is wired to the page.

- Webflow page ID: `6abbf138cf805da873bc9992`
- Page: `Reusable Sticky Media Transition Test`
- Slug: `/reusable-sticky-media-transition-test`
- Staging URL: `https://branda-d908cc.webflow.io/reusable-sticky-media-transition-test`
- Status when captured: user-confirmed visually correct
- Rule: do not change this Webflow page while aligning the GitHub module. The text reveals remain independent of the sticky-media composition.

## Proven transition choreography

The working page transition uses the following sequence and values:

```js
q('[data-sticky-media-bg]').forEach(e =>
  gsap.fromTo(e,
    { opacity: 0, translateZ: 10 },
    {
      opacity: 1,
      translateZ: 10,
      ease: 'none',
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: 'center center',
        scrub: true
      }
    }
  )
);

ScrollTrigger.matchMedia({
  '(min-width: 992px)': function () {
    q('[data-sticky-media-current], [data-sticky-media-next]').forEach(e =>
      gsap.fromTo(e,
        { yPercent: 0, translateZ: 10 },
        {
          yPercent: 100,
          translateZ: 10,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: '50% center',
            end: '85% bottom',
            scrub: 1.2
          }
        }
      )
    );

    q('[data-sticky-media-stage]').forEach(e =>
      gsap.fromTo(e,
        { scale: 1, yPercent: 0, translateZ: 10 },
        {
          scale: 0.4,
          yPercent: -15,
          translateZ: 10,
          ease: 'In',
          scrollTrigger: {
            trigger: root,
            start: '25% center',
            end: '85% bottom',
            scrub: 1.2
          }
        }
      )
    );

    q('[data-sticky-media-primary]').forEach(e =>
      gsap.fromTo(e,
        { '--mask-size': '100% 150%' },
        {
          '--mask-size': '100% 0%',
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: '85% bottom',
            end: 'bottom bottom',
            scrub: true
          }
        }
      )
    );

    q('[data-sticky-media-secondary]').forEach(e =>
      gsap.fromTo(e,
        { '--mask-size': '100% 0%', '--mask-y': '200%' },
        {
          '--mask-size': '100% 150%',
          '--mask-y': '50%',
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: '85% bottom',
            end: 'bottom bottom',
            scrub: true
          }
        }
      )
    );
  }
});

requestAnimationFrame(() => ScrollTrigger.refresh());
```

## Important separation

The same Webflow page currently also initializes SplitText character/line/group reveals. Those are **not part of the sticky-media composition** and should remain independent modules. This baseline only governs the transition choreography above.

## Required visual/mechanical CSS on the proof page

The page also retains source-derived visual/mechanical CSS for:

- sticky switcher clipping
- light background gradient
- primary media mask image
- secondary/reveal media mask image
- mask variables `--mask-size`, `--mask-x`, and `--mask-y`

Those visual asset choices are instance-specific and must not be hardcoded into the generic motion module.
