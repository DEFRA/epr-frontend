import { backend } from '#server/common/helpers/backend-client.js'

import { reportApiPath } from './report-paths.js'

/**
 * @import { SubmissionKeys } from './report-paths.js'
 * @import { BackendToken } from '#server/common/helpers/backend-token.js'
 */

/**
 * Creates an in-progress report for a specific period via the backend API.
 * @param {SubmissionKeys} keys
 * @param {BackendToken} backendToken
 * @returns {Promise<unknown>}
 */
export const createReport = (keys, backendToken) =>
  backend(backendToken).post(reportApiPath(keys))
