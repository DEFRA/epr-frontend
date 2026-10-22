import { reportBackend } from './report-backend.js'
import { reportApiPath } from './report-paths.js'

/**
 * @import { SubmissionKeys } from './report-paths.js'
 * @import { BackendToken } from '#server/common/helpers/backend-token.js'
 */

/**
 * Updates a report via the backend PATCH endpoint.
 * @param {SubmissionKeys} keys
 * @param {Record<string, unknown>} fields - Fields to update (e.g. { supportingInformation } or { status })
 * @param {BackendToken} backendToken
 * @returns {Promise<unknown>}
 */
export const updateReport = (keys, fields, backendToken) =>
  reportBackend(backendToken).patch(reportApiPath(keys), fields)
