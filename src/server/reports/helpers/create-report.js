import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

import { reportApiPath } from './report-paths.js'

/**
 * @import { SubmissionKeys } from './report-paths.js'
 */

/**
 * Creates an in-progress report for a specific period via the backend API.
 * @param {SubmissionKeys} keys
 * @param {string} backendToken
 * @returns {Promise<unknown>}
 */
export async function createReport(keys, backendToken) {
  return fetchJsonFromBackend(reportApiPath(keys), {
    method: 'POST',
    headers: { Authorization: `Bearer ${backendToken}` }
  })
}
