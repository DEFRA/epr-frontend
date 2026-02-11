import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'

/**
 * PRN-specific material display names that differ from the shared helper
 */
const MATERIAL_OVERRIDES = Object.freeze({
  Fibre: 'Fibre based composite'
})

/**
 * Gets the display name for a registration's material, with PRN-specific overrides.
 * @param {object} registration - The registration object
 * @param {string} registration.material - The material code
 * @param {string[]} [registration.glassRecyclingProcess] - The glass recycling process array (required for glass)
 * @returns {string} The formatted display name
 */
export function getPrnDisplayMaterial(registration) {
  const baseName = getDisplayMaterial(registration)
  return MATERIAL_OVERRIDES[baseName] ?? baseName
}
