import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * @typedef {object} DecemberPrnEligibility
 * @property {boolean} eligible - Whether the December Waste declaration window is currently open for this accreditation
 */

/**
 * Whether the December Waste declaration window is currently open for an
 * accreditation (PAE-1913). Timing only - combine with `reprocessingType`
 * (see show-december-waste-question.js) to decide whether to show the
 * declaration control.
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
