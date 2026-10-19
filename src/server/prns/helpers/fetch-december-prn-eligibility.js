import { backend } from '#server/common/helpers/backend-client.js'
import { prnsPath } from './prn-resource.js'

/**
 * @typedef {object} DecemberPrnEligibility
 * @property {'pool' | 'manual' | 'none'} mode - Which December Waste control this accreditation's type resolves to
 * @property {boolean} windowOpen - Whether the December Waste declaration window is currently open for this accreditation
 */

/**
 * Which December Waste control should be shown, and whether it may currently
 * be submitted (PAE-1913, PAE-1922): the operator-type and window-timing
 * halves of the rule, decided by the backend (see
 * resolve-december-waste-choice.js, which composes the two facts this
 * returns into the control to render).
 * @param {AccreditationKeys} keys
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<DecemberPrnEligibility>}
 */
const fetchDecemberPrnEligibility = (keys, backendToken) =>
  backend(backendToken).get(`${prnsPath(keys)}/december-prn-eligibility`)

export { fetchDecemberPrnEligibility }

/**
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 */
