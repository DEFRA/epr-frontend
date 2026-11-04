/** @type {Record<string, string | undefined>} */
const GLASS_RECYCLING_PROCESS_DISPLAY_NAMES = Object.freeze({
  glass_re_melt: 'Glass remelt',
  glass_other: 'Glass other'
})

/** @type {Record<string, string | undefined>} */
const APPLIED_FOR_MATERIAL_DISPLAY_NAMES = Object.freeze({
  aluminium: 'Aluminium',
  fibre: 'Fibre-based composite',
  glass: 'Glass',
  paper: 'Paper and board',
  plastic: 'Plastic',
  steel: 'Steel',
  wood: 'Wood'
})

/**
 * The backend can add a material without this repo hearing about it, and a
 * regulator reads records this service did not create, so a material this app
 * does not know keeps its own name rather than failing the page.
 * @param {string} material a `Material` or an `AppliedForMaterial`
 * @returns {string}
 */
export const getMaterialDisplayName = (material) =>
  GLASS_RECYCLING_PROCESS_DISPLAY_NAMES[material] ??
  APPLIED_FOR_MATERIAL_DISPLAY_NAMES[material] ??
  material
