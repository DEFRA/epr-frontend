import { reportBackend, reportPath } from './report-backend.js'

/**
 * Updates a report via the backend PATCH endpoint.
 * @param {{ organisationId: string, registrationId: string, year: number, cadence: string, period: number, submissionNumber: number }} periodParams
 * @param {Record<string, unknown>} fields - Fields to update (e.g. { supportingInformation } or { status })
 * @param {string} backendToken
 * @returns {Promise<unknown>}
 */
export async function updateReport(periodParams, fields, backendToken) {
  return reportBackend(backendToken).patch(reportPath(periodParams), fields)
}
