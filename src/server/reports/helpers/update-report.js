import { fetchReportBackend } from './fetch-report-backend.js'

/**
 * Updates a report via the backend PATCH endpoint.
 * @param {{ organisationId: string, registrationId: string, year: number, cadence: string, period: number, submissionNumber: number }} periodParams
 * @param {Record<string, unknown>} fields - Fields to update (e.g. { supportingInformation } or { status })
 * @param {string} idToken
 * @returns {Promise<unknown>}
 */
export async function updateReport(periodParams, fields, idToken) {
  const {
    organisationId,
    registrationId,
    year,
    cadence,
    period,
    submissionNumber
  } = periodParams
  const path = `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/reports/${year}/${encodeURIComponent(cadence)}/${period}/${submissionNumber}`

  return fetchReportBackend(path, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(fields)
  })
}
