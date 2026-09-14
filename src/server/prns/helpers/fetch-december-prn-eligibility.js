import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

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
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {string} accreditationId
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<DecemberPrnEligibility>}
 */
async function fetchDecemberPrnEligibility(
  organisationId,
  registrationId,
  accreditationId,
  backendToken
) {
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/accreditations/${encodeURIComponent(accreditationId)}/packaging-recycling-notes/december-prn-eligibility`

  return fetchJsonFromBackend(path, {
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })
}

export { fetchDecemberPrnEligibility }
