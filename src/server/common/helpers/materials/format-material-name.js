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
 * Formats a material code for display
 * @param {string} material - The material code
 * @returns {string} The formatted display name
 */
function formatMaterialName(material) {
  const displayName = MATERIAL_DISPLAY_NAMES[material]
  if (!displayName) {
    throw Boom.internal(`Unknown material: ${material}`)
  }

  return displayName
}

/**
 * Gets the display name for a registration's material, handling glass recycling process types
 * @param {object} registration - The registration object
 * @param {string} registration.material - The material code
 * @param {string[] | null | undefined} registration.glassRecyclingProcess - The glass recycling process array
 * @returns {string} The formatted display name
 */
export function getDisplayMaterial(registration) {
  const { material, glassRecyclingProcess } = registration

  if (material !== 'glass') {
    return formatMaterialName(material)
  }

  if (!glassRecyclingProcess?.length) {
    throw Boom.internal('Glass registration missing glassRecyclingProcess')
  }

  if (glassRecyclingProcess.length > 1) {
    throw Boom.internal(
      'Glass registration has multiple glassRecyclingProcess values'
    )
  }

  const [processType] = glassRecyclingProcess
  const displayName = GLASS_DISPLAY_NAMES[processType]

  if (!displayName) {
    throw Boom.internal(
      `Glass registration has invalid glassRecyclingProcess: ${processType}`
    )
  }

  return displayName
}
