import { fetchReportBackend } from './fetch-report-backend.js'

/**
 * Updates a report via the backend PATCH endpoint.
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {number} year
 * @param {string} cadence
 * @param {number} period
 * @param {number} submissionNumber
 * @param {Record<string, unknown>} fields - Fields to update (e.g. { supportingInformation } or { status })
 * @param {string} idToken
 * @returns {Promise<unknown>}
 */
export async function updateReport(
  organisationId,
  registrationId,
  year,
  cadence,
  period,
  submissionNumber,
  fields,
  idToken
) {
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/reports/${year}/${encodeURIComponent(cadence)}/${period}/${submissionNumber}`

  return fetchReportBackend(path, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(fields)
  })
}
