import { reportPath, reportsListPath } from './report-paths.js'

/**
 * Returns the redirect URL for save (reports list) or continue (next page).
 * @param {HapiRequest} request
 * @param {SubmissionKeys} params
 * @param {string} action - 'continue' or 'save'
 * @param {string} nextPage - path segment for the continue destination (e.g. 'free-perns')
 * @returns {string}
 */
export function getRedirectUrl(request, params, action, nextPage) {
  if (action === 'continue') {
    return request.localiseUrl(`${reportPath(params)}/${nextPage}`)
  }

  return request.localiseUrl(reportsListPath(params))
}

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { SubmissionKeys } from './report-paths.js'
 */
