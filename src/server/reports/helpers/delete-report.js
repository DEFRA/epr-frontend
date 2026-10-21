import { backend } from '#server/common/helpers/backend-client.js'

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
export const deleteReport = (keys, backendToken) =>
  backend(backendToken).delete(reportApiPath(keys))
