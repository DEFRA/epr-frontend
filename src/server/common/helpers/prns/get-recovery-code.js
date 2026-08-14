import { materialToProcessCode } from '#domain/materials.js'

/** @import { Material, ProcessCode } from '#domain/materials.js' */

/**
 * Get the recovery process code for a given material
 * @param {Material} material
 * @returns {ProcessCode | ''}
 */
export const getRecoveryCode = (material) =>
  materialToProcessCode[material] ?? ''
