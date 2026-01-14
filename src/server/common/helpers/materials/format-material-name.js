import { capitalize } from 'lodash-es'

const MATERIAL_DISPLAY_NAMES = Object.freeze({
  paper: 'Paper and board'
})

/**
 * Formats a material code for display
 * @param {string | undefined | null} material - The material code
 * @returns {string} The formatted display name
 */
export function formatMaterialName(material) {
  if (!material) {
    return ''
  }

  return MATERIAL_DISPLAY_NAMES[material] ?? capitalize(material)
}
