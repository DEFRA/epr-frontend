import { reportBackend, reportPath } from './report-backend.js'

/**
 * @import { ReportAddress } from './report-backend.js'
 */

/**
 * Updates a report via the backend PATCH endpoint.
 * @param {ReportAddress} periodParams
 * @param {Record<string, unknown>} fields - Fields to update (e.g. { supportingInformation } or { status })
 * @param {string} backendToken
 * @returns {Promise<unknown>}
 */
export const updateReport = (periodParams, fields, backendToken) =>
  reportBackend(backendToken).patch(reportPath(periodParams), fields)
