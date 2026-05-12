import { errorCodes } from '#server/common/enums/error-codes.js'
import { MATERIAL } from '#domain/organisations/model.js'
import { internal } from '#server/common/helpers/logging/cdp-boom.js'

/**
 * @import { Material, GlassRecyclingProcess } from '#domain/organisations/model.js'
 */

const MATERIAL_DISPLAY_NAMES = Object.freeze({
  aluminium: 'Aluminium',
  fibre: 'Fibre-based composite',
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
 * @template {Record<string, string>} T
 * @param {T} displayNames
 * @param {string} key
 * @param {string} code
 * @param {string} label
 * @returns {string}
 */
const lookupOrThrow = (displayNames, key, code, label) => {
  const displayName = displayNames[key]

  if (!displayName) {
    throw internal(`Unknown ${label}: ${key}`, code, {
      event: { action: 'lookup_material', reason: `${label}=${key}` }
    })
  }

  return displayName
}

/**
 * Gets the display name for a registration's material.
 * For glass, uses the first glassRecyclingProcess entry as the lookup key.
 * @param {{material: Material, glassRecyclingProcess?: GlassRecyclingProcess[]}} registration
 * @returns {string}
 */
export const getDisplayMaterial = ({ material, glassRecyclingProcess }) => {
  if (material === MATERIAL.GLASS) {
    if (!glassRecyclingProcess || glassRecyclingProcess.length === 0) {
      throw internal(
        'Missing glassRecyclingProcess for glass material',
        errorCodes.glassRecyclingProcessMissing,
        { event: { action: 'lookup_material', reason: 'material=glass' } }
      )
    }

    return lookupOrThrow(
      GLASS_DISPLAY_NAMES,
      glassRecyclingProcess[0],
      errorCodes.glassRecyclingProcessUnknown,
      'glassRecyclingProcess'
    )
  }

  return lookupOrThrow(
    MATERIAL_DISPLAY_NAMES,
    material,
    errorCodes.unknownMaterial,
    'material'
  )
}
