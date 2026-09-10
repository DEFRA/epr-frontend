import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * @typedef {object} DecemberPrnEligibility
 * @property {boolean} declaresDecemberWasteManually - Whether this accreditation's type declares December waste manually rather than deriving it from a balance
 * @property {boolean} windowOpen - Whether the December Waste declaration window is currently open for this accreditation
 */

/**
 * Whether an accreditation's December Waste declaration control should be
 * shown (PAE-1913): both the operator-type and window-timing halves of the
 * rule, decided by the backend (see show-december-waste-question.js, which
 * composes the two flags this returns).
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
