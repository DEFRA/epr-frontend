function buildBasePath({ organisationId, registrationId }) {
  return `/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/reports`
}

/**
 * Returns the redirect URL for the save action (reports list page).
 * @param {Request} request
 * @param {{ organisationId: string, registrationId: string }} params
 * @returns {string}
 */
export function getSaveRedirectUrl(request, params) {
  return request.localiseUrl(buildBasePath(params))
}

/**
 * Returns the redirect URL for the continue action (next data-entry page).
 * @param {Request} request
 * @param {{ organisationId: string, registrationId: string, year: number, cadence: string, period: number }} params
 * @param {string} nextPage - path segment for the continue destination (e.g. 'free-perns')
 * @returns {string}
 */
export function getContinueRedirectUrl(request, params, nextPage) {
  const { year, cadence, period } = params
  const basePath = buildBasePath(params)
  return request.localiseUrl(
    `${basePath}/${encodeURIComponent(year)}/${encodeURIComponent(cadence)}/${encodeURIComponent(period)}/${encodeURIComponent(nextPage)}`
  )
}

/**
 * @import { Request } from '@hapi/hapi'
 */
