import { backend } from '#server/common/helpers/backend-client.js'

import { reportApiPath } from './report-paths.js'

/**
 * @import { SubmissionKeys } from './report-paths.js'
 * @import { BackendToken } from '#server/common/helpers/backend-token.js'
 */

/**
 * Deletes a report for a specific period via the backend API.
 * @param {SubmissionKeys} keys
 * @param {BackendToken} backendToken
 * @returns {Promise<void>}
 */
export const deleteReport = (keys, backendToken) =>
  backend(backendToken).delete(reportApiPath(keys))
