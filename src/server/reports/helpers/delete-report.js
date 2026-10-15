import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

import { reportApiPath } from './report-paths.js'

/**
 * @import { SubmissionKeys } from './report-paths.js'
 */

/**
 * Deletes a report for a specific period via the backend API.
 * @param {SubmissionKeys} keys
 * @param {string} backendToken
 * @returns {Promise<void>}
 */
export async function deleteReport(keys, backendToken) {
  return fetchJsonFromBackend(reportApiPath(keys), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${backendToken}` }
  })
}
