import Boom from '@hapi/boom'

const MATERIAL_DISPLAY_NAMES = Object.freeze({
  aluminium: 'Aluminium',
  fibre: 'Fibre',
  glass: 'Glass',
  paper: 'Paper and board',
  plastic: 'Plastic',
  steel: 'Steel',
  wood: 'Wood'
})

/**
 * Formats a material code for display
 * @param {string} material - The material code
 * @returns {string} The formatted display name
 */
export function formatMaterialName(material) {
  const displayName = MATERIAL_DISPLAY_NAMES[material]
  if (!displayName) {
    throw Boom.internal(`Unknown material: ${material}`)
  }

  return displayName
}
