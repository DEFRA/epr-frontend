/**
 * Packaging materials, and the vocabularies derived from them.
 *
 * This service is the source of truth for how a material reads to a user, so
 * the display names here are the ones epr-re-ex-admin-frontend follows. They
 * differ from the labels epr-backend puts in the public register CSV, which are
 * frozen because that register is published.
 */

/**
 * A material a registration or accreditation can be held for. Glass is a single
 * material here; the recycling process it is handled by is a separate axis.
 * @typedef {typeof MATERIAL[keyof typeof MATERIAL]} Material
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

/**
 * @typedef {typeof GLASS_RECYCLING_PROCESS[keyof typeof GLASS_RECYCLING_PROCESS]} GlassRecyclingProcess
 */
export const GLASS_RECYCLING_PROCESS = Object.freeze({
  GLASS_RE_MELT: 'glass_re_melt',
  GLASS_OTHER: 'glass_other'
})

/**
 * The granularity tonnage is reported and displayed at: glass splits into its
 * two recycling processes, every other material stands alone.
 * @typedef {Exclude<Material, 'glass'> | GlassRecyclingProcess} EffectiveMaterial
 */

/**
 * Glass is absent by design — a glass registration is shown by its recycling
 * process, so it is never displayed as plain 'Glass'.
 * @type {Record<Exclude<Material, 'glass'>, string>}
 */
export const materialToDisplayName = Object.freeze({
  [MATERIAL.ALUMINIUM]: 'Aluminium',
  [MATERIAL.FIBRE]: 'Fibre-based composite',
  [MATERIAL.PAPER]: 'Paper and board',
  [MATERIAL.PLASTIC]: 'Plastic',
  [MATERIAL.STEEL]: 'Steel',
  [MATERIAL.WOOD]: 'Wood'
})

/** @type {Record<GlassRecyclingProcess, string>} */
export const glassProcessToDisplayName = Object.freeze({
  [GLASS_RECYCLING_PROCESS.GLASS_RE_MELT]: 'Glass remelt',
  [GLASS_RECYCLING_PROCESS.GLASS_OTHER]: 'Glass other'
})

/**
 * EU waste recovery operation codes.
 * @see https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02008L0098-20180705
 * @typedef {typeof PROCESS_CODE[keyof typeof PROCESS_CODE]} ProcessCode
 */
export const PROCESS_CODE = Object.freeze({
  R3: 'R3', // Recycling/reclamation of organic substances
  R4: 'R4', // Recycling/reclamation of metals and metal compounds
  R5: 'R5' // Recycling/reclamation of inorganic materials
})

/**
 * The recovery operation each material is recycled under. Typed as a total map
 * so a new material cannot be added without giving it a code.
 * @type {Record<Material, ProcessCode>}
 */
export const materialToProcessCode = Object.freeze({
  [MATERIAL.ALUMINIUM]: PROCESS_CODE.R4,
  [MATERIAL.FIBRE]: PROCESS_CODE.R3,
  [MATERIAL.GLASS]: PROCESS_CODE.R5,
  [MATERIAL.PAPER]: PROCESS_CODE.R3,
  [MATERIAL.PLASTIC]: PROCESS_CODE.R3,
  [MATERIAL.STEEL]: PROCESS_CODE.R4,
  [MATERIAL.WOOD]: PROCESS_CODE.R3
})
