export const motionTokens = Object.freeze({
  duration: Object.freeze({
    instant: 0,
    fast: 0.38,
    medium: 0.55,
    standard: 0.7,
    slow: 1,
    deliberate: 1.4,
    ambient: 18
  }),
  easing: Object.freeze({
    linear: "none",
    gentle: "power2.out",
    standard: "power3.out",
    enter: "power4.out",
    exit: "power3.in",
    smooth: "power4.inOut"
  }),
  stagger: Object.freeze({
    tight: 0.025,
    compact: 0.035,
    standard: 0.06,
    relaxed: 0.08,
    wide: 0.2
  }),
  distance: Object.freeze({
    xs: 5,
    sm: 15,
    md: 35,
    lg: 40,
    reveal: 110
  })
});

export function resolveMotionToken(group, value, fallback = value) {
  if (!group || typeof value !== "string") return fallback;
  return motionTokens[group]?.[value] ?? fallback;
}
