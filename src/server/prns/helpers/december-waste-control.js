/**
 * Which December Waste control the create page renders. Exactly one applies to
 * any accreditation: it either accrues a December pool to choose from, or
 * self-declares the marker for disclosure, or neither.
 */
export const DECEMBER_WASTE_CONTROL = Object.freeze({
  selectPool: 'pool',
  declareManually: 'manual',
  none: 'none'
})
