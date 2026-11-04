// copied from matching file in epr-backend - keep in sync (as much as we need)

/**
 * Status values a registration can hold.
 * @typedef {typeof REGISTRATION_STATUS[keyof typeof REGISTRATION_STATUS]} RegistrationStatus
 */
export const REGISTRATION_STATUS = Object.freeze({
  CREATED: 'created',
  APPROVED: 'approved',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
})

/**
 * Status values an accreditation can hold.
 * @typedef {typeof ACCREDITATION_STATUS[keyof typeof ACCREDITATION_STATUS]} AccreditationStatus
 */
export const ACCREDITATION_STATUS = Object.freeze({
  CREATED: 'created',
  APPROVED: 'approved',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended'
})

/**
 * Status values for organisations
 */
export const ORGANISATION_STATUS = Object.freeze({
  CREATED: 'created',
  APPROVED: 'approved',
  ACTIVE: 'active',
  REJECTED: 'rejected'
})

/**
 * @typedef {typeof REGULATOR[keyof typeof REGULATOR]} RegulatorValue
 */
export const REGULATOR = Object.freeze({
  EA: 'ea',
  NRW: 'nrw',
  SEPA: 'sepa',
  NIEA: 'niea'
})

/**
 * The material as the applicant declared it on the form, which is one of the
 * seven the form offers and so includes plain `glass`.
 * @typedef {typeof MATERIAL[keyof typeof MATERIAL]} AppliedForMaterial
 */
export const MATERIAL = Object.freeze({
  ALUMINIUM: 'aluminium',
  FIBRE: 'fibre',
  GLASS: 'glass',
  PAPER: 'paper',
  PLASTIC: 'plastic',
  STEEL: 'steel',
  WOOD: 'wood'
})

export const WASTE_PROCESSING_TYPE = Object.freeze({
  REPROCESSOR: 'reprocessor',
  EXPORTER: 'exporter'
})

/**
 * @typedef {typeof REPROCESSING_TYPE[keyof typeof REPROCESSING_TYPE]} ReprocessingType
 */
export const REPROCESSING_TYPE = Object.freeze({
  INPUT: 'input',
  OUTPUT: 'output'
})

/**
 * @typedef {typeof GLASS_RECYCLING_PROCESS[keyof typeof GLASS_RECYCLING_PROCESS]} GlassRecyclingProcess
 */
export const GLASS_RECYCLING_PROCESS = Object.freeze({
  GLASS_RE_MELT: 'glass_re_melt',
  GLASS_OTHER: 'glass_other'
})

/**
 * The material a record is for. Glass is the only material that sub-divides,
 * so this is one of the six that do not, or one of the two glass recycling
 * processes. Plain `glass` is not one of them: a record still holding it has
 * not been split, and so is not yet for either.
 * @typedef {Exclude<AppliedForMaterial, 'glass'> | GlassRecyclingProcess} Material
 */

/**
 * @typedef {typeof TONNAGE_BAND[keyof typeof TONNAGE_BAND]} TonnageBand
 */
export const TONNAGE_BAND = Object.freeze({
  UP_TO_500: 'up_to_500',
  UP_TO_5000: 'up_to_5000',
  UP_TO_10000: 'up_to_10000',
  OVER_10000: 'over_10000'
})
