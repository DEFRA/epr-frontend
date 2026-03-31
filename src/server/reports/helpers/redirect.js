/**
 * Returns the redirect URL for save (reports list) or continue (next page).
 * @param {Request} request
 * @param {{ organisationId: string, registrationId: string, year: number, cadence: string, period: number }} params
 * @param {string} action - 'continue' or 'save'
 * @param {string} nextPage - path segment for the continue destination (e.g. 'free-perns')
 * @returns {string}
 */
export function getRedirectUrl(request, params, action, nextPage) {
  const { organisationId, registrationId, year, cadence, period } = params
  const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports`

  if (action === 'continue') {
    return request.localiseUrl(
      `${basePath}/${year}/${cadence}/${period}/${nextPage}`
    )
  }

  return request.localiseUrl(basePath)
}

/**
 * @import { Request } from '@hapi/hapi'
 */
