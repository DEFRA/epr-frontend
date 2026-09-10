/**
 * @import { DecemberPrnEligibility } from './fetch-december-prn-eligibility.js'
 */

/**
 * Whether the "Is this December waste?" question should be shown on the
 * create-PRN journey (PAE-1913). Both halves come from the backend now:
 * whether this accreditation's type declares December waste manually at all
 * (only a reprocessor on output today - see
 * declaresDecemberWasteManually in epr-backend's december-waste-window.js),
 * and whether the declaration window is currently open. Purely a composition
 * of the two; no rule is restated here.
 * @param {DecemberPrnEligibility} eligibility
 * @returns {boolean}
 */
export const resolveCanDeclareDecemberWasteManually = ({
  declaresDecemberWasteManually,
  windowOpen
}) => declaresDecemberWasteManually && windowOpen
