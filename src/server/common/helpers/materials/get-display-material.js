import { errorCodes } from '#server/common/enums/error-codes.js'
import { MATERIAL } from '#domain/organisations/model.js'
import { internal } from '#server/common/helpers/logging/cdp-boom.js'

/**
 * @import { AppliedForMaterial, GlassRecyclingProcess } from '#domain/organisations/model.js'
 */

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
 * @template {Record<string, string | undefined>} T
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

/**
 * @param {{material: AppliedForMaterial, glassRecyclingProcess?: GlassRecyclingProcess[]}} registration
 * @returns {string}
 */
export const getRegistrationMaterialDisplayName = ({
  material,
  glassRecyclingProcess
}) => {
  if (material === MATERIAL.GLASS) {
    if (!glassRecyclingProcess || glassRecyclingProcess.length === 0) {
      throw internal(
        'Missing glassRecyclingProcess for glass material',
        errorCodes.glassRecyclingProcessMissing,
        { event: { action: 'lookup_material', reason: 'material=glass' } }
      )
    }

    return lookupOrThrow(
      GLASS_RECYCLING_PROCESS_DISPLAY_NAMES,
      glassRecyclingProcess[0],
      errorCodes.glassRecyclingProcessUnknown,
      'glassRecyclingProcess'
    )
  }

  return lookupOrThrow(
    APPLIED_FOR_MATERIAL_DISPLAY_NAMES,
    material,
    errorCodes.unknownMaterial,
    'material'
  )
}
