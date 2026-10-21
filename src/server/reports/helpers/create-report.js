import { backend } from '#server/common/helpers/backend-client.js'

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
export const createReport = (keys, backendToken) =>
  backend(backendToken).post(reportApiPath(keys))
