/** Migration metadata for the new auto-by-default typography family only. */
export const stationaryTypographyPolicy = Object.freeze({
  defaultAlignment: 'auto',
  safeAuto: ['stroke-fill','glyph-mask-reveal','occlusion-blocks','emphasis-transfer','slice-fragment-reveal','negative-space-cutout','material-shift'],
  mediumAuto: ['inner-letter-space','typography-gap-space','section-space','architecture-space','weight-pressure','counter-expansion','selective-glyph-activation']
});
export const stationaryTypographyNames = Object.freeze([...stationaryTypographyPolicy.safeAuto, ...stationaryTypographyPolicy.mediumAuto]);
