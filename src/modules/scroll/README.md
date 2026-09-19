# Existing scroll animation contracts

This directory organizes the existing modules that own, follow, or respond to scrolling. The 14 stationary typography modules are excluded. Original src/modules/<name>.js entry points re-export the same module objects, so existing imports and Webflow data-motion values remain valid.

## Controls

- data-motion-alignment="auto" selects automatic geometry for a scroll owner.
- data-motion-alignment="legacy" preserves existing manual behavior and defaults.
- data-motion-alignment="manual" is an alias for legacy; data-motion-align is accepted as shorthand.
- Existing aligned mode remains available for statement-compression.
- Defaults remain legacy. This update does not opt existing Webflow elements into auto.
- Manual owners accept data-motion-start and data-motion-end. Newly integrated owners also accept data-motion-scroll-distance in pixels or data-motion-scroll-vh for a viewport-based range; end takes priority, then pixel distance, then vh.
- data-motion-scrub remains an independent manual smoothing setting, including in auto mode.
- Custom hero auto spans use measured sizes and authored phase fractions. This is a pacing heuristic, not an exact physical solver or a change to the phase sequence. data-motion-scroll-factor scales that heuristic.
- Shared-planner modules retain their existing planner profile and descriptor interface. Their manual start/end attributes belong to legacy mode. Time-based reveals still play as time-based reveals; setting their end does not turn them into scrubbed animations.
- Pinning stays with each module. No universal pin override is added: pinning a follower or disabling a room's structural pin can break its composition.

## Ownership exceptions

Followers do not acquire competing triggers in auto mode. Select auto/legacy on the named parent owner; followers use its resulting range. Their existing progress-start/progress-end attributes provide manual local windows; pin-overlap-next exposes its overlap amount. An alignment attribute on a follower does not override the parent's mode. Missing parent IDs remain configuration errors or no-ops as before. Parent IDs are resolved again each update to handle remounts.

Native stacked-cards uses browser sticky layout, not ScrollTrigger. Its measured overlap already recalculates with ResizeObserver. Auto does not invent ScrollTrigger start/end values. Manual controls remain stack-top, stack-offset and stack-overlap.

Spatial-loop remains input-driven while locked. Auto/manual applies to the release runway, not its wheel inertia, snap logic or the two-pixel lock detector. character-scatter-title's velocity detector also remains independent of its configurable fall timeline.

The scroll-synced-gallery uses per-item ranges. Manual start/end apply to each item; media scaling follows that item's actual progress. Auto retains the crossing-line recipe and activation attribute.

## Module inventory

| Module | Before this update | Auto geometry / ownership | Manual controls |
| --- | --- | --- | --- |
| `brand-field-activate` | Auto + legacy existed | Shared composition planner; actual radial per-item stages | Existing start/end where relevant, scrub and module-specific pin settings |
| `brand-load` | Own geometry/manual settings; no consistent mode | Trigger and element size in motion-on-view mode | on-view start; time-based playback |
| `branda-spatial-works` | Own geometry/manual settings; no consistent mode | Existing camera projection, plane travel and settle progress | start / end / scroll-distance / scroll-vh; scrub where relevant |
| `character-scatter-title` | Own geometry/manual settings; no consistent mode | undefined | start / end / scroll-distance / scroll-vh; scrub where relevant |
| `depth-emerge` | Own geometry/manual settings; no consistent mode | Measured stage height/scale, or inherited parent progress | Own range settings, or parent mode + local progress window |
| `element-blur-reveal` | Parent-owned only | Inherits named parent trigger's calculated range | Parent mode + existing local window/amount |
| `element-layout-return` | Own geometry/manual settings; no consistent mode | Measured placeholder-to-stage delta, or inherited parent progress | Own range settings, or parent mode + local progress window |
| `flip-relocation` | Own geometry/manual settings; no consistent mode | Measured source-parent-to-target displacement | start / end / scroll-distance / scroll-vh; scrub where relevant |
| `footer-reveal` | Own geometry/manual settings; no consistent mode | Footer size and existing reveal duration | start / end / scroll-distance / scroll-vh; scrub where relevant |
| `field-takeover` | New reusable composition | Authored Webflow A/B field geometry with geometry-derived auto runway | start / end / scroll-distance / scroll-vh; scrub, pin and content phase controls |
| `hero-frame-transition` | Own geometry/manual settings; no consistent mode | Module-owned phase pacing; frame/side sizes and phase fractions | start / end / scroll-distance / scroll-vh; scrub where relevant |
| `hero-heart-transition` | Own geometry/manual settings; no consistent mode | Module-owned phase pacing; slit, rotation, shrink, heart and surface phases | start / end / scroll-distance / scroll-vh; scrub where relevant |
| `hero-slit-transition` | Own geometry/manual settings; no consistent mode | Module-owned phase pacing; slit, rotation and shrink fractions | start / end / scroll-distance / scroll-vh; scrub where relevant |
| `image-clip` | Auto + legacy existed | Shared reveal planner; clip duration and trigger geometry | Existing start/end where relevant, scrub and module-specific pin settings |
| `liquid-fill` | Own geometry/manual settings; no consistent mode | Container height, or end-trigger bottom crossing | start / end / scroll-distance / scroll-vh; scrub where relevant |
| `media-room` | Own geometry/manual settings; no consistent mode | Existing depth spacing, image count, viewport and room metrics | start / end / scroll-distance / scroll-vh; scrub where relevant |
| `morph-narrative` | Own geometry/manual settings; no consistent mode | Source height, viewport pacing and morph count | start / end / scroll-distance / scroll-vh; scrub where relevant |
| `pin-overlap-next` | Parent-owned only | Inherits named parent trigger's pin span | Parent mode + existing local window/amount |
| `scramble-text` | Auto + legacy existed | Shared reveal planner in motion-event=scroll mode | Scroll event start; time-based playback |
| `scroll-synced-gallery` | Own geometry/manual settings; no consistent mode | Per-item viewport crossing line; shared media/nav selection | start / end / scroll-distance / scroll-vh; scrub where relevant |
| `scroll-travel` | Own geometry/manual settings; no consistent mode | Measured travel and container height | start / end / scroll-distance / scroll-vh; scrub where relevant |
| `section-handoff` | Own geometry/manual settings; no consistent mode | Measured background bleed, or inherited parent progress for position | Own range settings, or parent mode + local progress window |
| `services-center-shift` | Own geometry/manual settings; no consistent mode | Measured intro-to-viewport-center offset and card sequence timing | start / end / scroll-distance / scroll-vh; scrub where relevant |
| `spatial-loop` | Own geometry/manual settings; no consistent mode | Measured sticky release runway; input takeover remains unchanged | Release start/end/distance/scrub; takeover unchanged |
| `stacked-cards` | Native measured layout | Browser-owned sticky scroll; measured card overlap | stack-top / stack-offset / stack-overlap |
| `statement-compression` | Auto + legacy existed | Shared composition planner; authored four-stage sequence | Existing start/end where relevant, scrub and module-specific pin settings |
| `svg-reveal` | Auto + legacy existed | Shared reveal planner; per-path timing and count | Existing start/end where relevant, scrub and module-specific pin settings |
| `synced-fade` | Parent-owned only | Inherits named parent trigger's calculated range | Parent mode + existing local window/amount |
| `tags-glitch` | Own geometry/manual settings; no consistent mode | Measured native sticky section runway | start / end / scroll-distance / scroll-vh; scrub where relevant |
| `theme-switch` | Own geometry/manual settings; no consistent mode | Element height and viewport crossing window | start / end / scroll-distance / scroll-vh; scrub where relevant |
| `blur-reveal` | Auto + legacy existed | Shared reveal planner; each split unit's height and stagger | Existing start/end where relevant, scrub and module-specific pin settings |
| `line-reveal` | Auto + legacy existed | Shared reveal planner; line height or authored pixel travel | Existing start/end where relevant, scrub and module-specific pin settings |
| `text-reveal` | Auto + legacy existed | Shared reveal planner; animated word/letter/line height | Existing start/end where relevant, scrub and module-specific pin settings |
| `parallax` | Auto + legacy existed | Shared composition planner; percentage travel converted from target height | Existing start/end where relevant, scrub and module-specific pin settings |
| `scroll-highlight` | Auto + legacy existed | Shared editorial planner; actual unit timing and stagger | Existing start/end where relevant, scrub and module-specific pin settings |
| `pinned-media` | Auto + legacy existed | Shared composition/spatial planner; scale delta and pin ownership | Existing start/end where relevant, scrub and module-specific pin settings |
| `pinned-steps` | Auto + legacy existed | Shared spatial planner; measured incoming panel height and step count | Existing start/end where relevant, scrub and module-specific pin settings |
| `character-converge` | Auto + legacy existed | Shared editorial planner; actual pixel offsets and stagger | Existing start/end where relevant, scrub and module-specific pin settings |
| `pinned-media-return` | Velocity measured; manual threshold only | Auto threshold = measured media height / response duration; actual scroll velocity still drives crop | crop-velocity-max / crop-inset / crop-response-duration / crop-velocity-smoothing |

## Verification and release

The PR validates module contracts, legacy defaults, custom hero phase preservation, compatibility imports, and alignment/build regression checks in GitHub Actions. Visual QA in real Webflow layouts is still required before approval.

pinned-media-return is a velocity-responsive scroll effect, not a trigger owner. Its auto mode calculates the normalization threshold from current media height and response duration. Legacy preserves the existing 1400px/s default or authored crop-velocity-max. The crop shape, maximum inset, easing and smoothing remain authored.

The scroll inventory above includes the reusable field-takeover composition alongside the previously audited scroll modules. Non-scroll/support modules remain outside this folder. The latter stay outside this folder: accordion-media, branda-spatial-pin-layout, branda-spatial-shell, cursor, grid-video-reveal, hover-background-swap, hover-highlight-box, hover-linked-illuminate, link-swap, loader-composition, looping-labels, magnetic, nav-flip, page-transition, paired-tag-intro, responsive-menu, stacked-image-hover, view-switch, works-services-transition. view-switch refreshes scroll measurements after switching views but does not own an animation range.

The root-level page-scroll service remains in src/core/page-scroll.js. It manages page smoothing; it is not an animation module. branda-spatial-shell and branda-spatial-pin-layout remain supporting layout helpers.

The existing unrelated full-suite spatial-loop helper and stale registry tests are not silently removed. No production merge or deployment is included.
