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

/**
 * The pool-selection state, shared by the create page's balance selector (see
 * resolve-december-waste-choice.js) and the dashboard / PRNs-list available
 * balance panel (see waste-balance/december-balance.js): the accreditation's
 * type resolves to the December pool and the declaration window is open. Both
 * facts are the backend's, carried on the eligibility response.
 * @param {DecemberPrnEligibility} eligibility
 * @returns {boolean}
 */
export const showsDecemberPool = ({ mode, windowOpen }) =>
  windowOpen && mode === DECEMBER_WASTE_CONTROL.selectPool

/**
 * @import { DecemberPrnEligibility } from './fetch-december-prn-eligibility.js'
 */
