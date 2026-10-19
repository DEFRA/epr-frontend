import { backend } from '#server/common/helpers/backend-client.js'
import { reportApiPath } from './report-paths.js'

/**
 * @import { SubmissionKeys } from './report-paths.js'
 */

/**
 * Requests resubmission on an operator's own submitted report via the
 * backend POST endpoint.
 * @param {SubmissionKeys} keys
 * @param {string} backendToken
 * @returns {Promise<unknown>}
 */
export const requestResubmission = (keys, backendToken) =>
  backend(backendToken).post(`${reportApiPath(keys)}/request-resubmission`)
