import { backend } from '#server/common/helpers/backend-client.js'
import { reportApiPath } from './report-paths.js'

/**
 * @import { SubmissionKeys } from './report-paths.js'
 * @import { BackendToken } from '#server/common/helpers/backend-token.js'
 */

/**
 * Requests resubmission on an operator's own submitted report via the
 * backend POST endpoint.
 * @param {SubmissionKeys} keys
 * @param {BackendToken} backendToken
 * @returns {Promise<unknown>}
 */
export const requestResubmission = (keys, backendToken) =>
  backend(backendToken).post(`${reportApiPath(keys)}/request-resubmission`)
