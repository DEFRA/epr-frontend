import Boom from '@hapi/boom'

const MATERIAL_DISPLAY_NAMES = Object.freeze({
  aluminium: 'Aluminium',
  fibre: 'Fibre',
  paper: 'Paper and board',
  plastic: 'Plastic',
  steel: 'Steel',
  wood: 'Wood'
})

const GLASS_DISPLAY_NAMES = Object.freeze({
  glass_re_melt: 'Glass remelt',
  glass_other: 'Glass other'
})

/**
 * Gets the display name for a registration's material
 * @param {object} registration - The registration object
 * @param {string} registration.material - The material code
 * @param {string[]} [registration.glassRecyclingProcess] - The glass recycling process array (required for glass)
 * @returns {string} The formatted display name
 */
export function getDisplayMaterial(registration) {
  const { material, glassRecyclingProcess } = registration

  if (material !== 'glass') {
    const displayName = MATERIAL_DISPLAY_NAMES[material]

    if (!displayName) {
      throw Boom.internal(`Unknown material: ${material}`)
    }

    return displayName
  }

  return GLASS_DISPLAY_NAMES[glassRecyclingProcess[0]]
}
