import { ACCOUNT_LINKING_PATH } from '#server/account/linking/controller.js'
import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'

const SUMMARY_LOG_GUIDANCE_URL =
  'https://www.gov.uk/government/publications/summary-log-templates-for-uk-packaging-waste/recording-uk-packaging-waste-in-summary-logs-supplementary-guidance'
const APPLY_FOR_REGISTRATION_URL =
  'https://www.gov.uk/guidance/packaging-waste-apply-for-registration-and-accreditation-as-a-reprocessor-or-exporter'
const SUMMARY_LOGS_OVERVIEW_URL =
  'https://www.gov.uk/guidance/summary-logs-for-uk-packaging-waste-an-overview'

/**
 * Determines the appropriate href for the "Start now" button based on auth state
 * @param {Request} request - Hapi request object
 * @returns {Promise<string>} The href for the start button
 */
async function getStartNowHref(request) {
  if (!request.auth.isAuthenticated) {
    return request.localiseUrl('/login')
  }

  const { idToken } = request.auth.credentials
  const organisations = await fetchUserOrganisations(idToken)

  if (organisations.linked) {
    return request.localiseUrl(`/organisations/${organisations.linked.id}`)
  }

  return request.localiseUrl(ACCOUNT_LINKING_PATH)
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  handler: async (request, h) => {
    const { t: localise } = request
    const startNowHref = await getStartNowHref(request)

    return h.view('home/index', {
      pageTitle: localise('home:pageTitle'),
      startNowHref,
      summaryLogGuidanceUrl: SUMMARY_LOG_GUIDANCE_URL,
      applyForRegistrationUrl: APPLY_FOR_REGISTRATION_URL,
      summaryLogsOverviewUrl: SUMMARY_LOGS_OVERVIEW_URL
    })
  }
}

/**
 * Redirect handler for / to /start
 * @satisfies {Partial<ServerRoute>}
 */
export const redirectToStart = {
  handler(request, h) {
    return h.redirect(request.localiseUrl('/start'))
  }
}

/**
 * @import { ServerRoute, Request } from '@hapi/hapi'
 */
