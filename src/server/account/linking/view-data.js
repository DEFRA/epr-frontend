/**
 * @import { Request } from '@hapi/hapi'
 * @import { UserSession } from '#server/auth/types/session.js'
 */

/**
 * Build view data for the account linking page
 * @param {Request} request
 * @param {UserSession} authedUser
 * @param {object} [options]
 * @param {object} [options.errors]
 * @returns {object}
 */
export function buildLinkingViewData(request, authedUser, options = {}) {
  const unlinked =
    authedUser?.organisations?.unlinked?.map(({ id, companyDetails }) => ({
      id,
      companyDetails
    })) ?? []

  const viewData = {
    pageTitle: request.t('account:linking:pageTitle'),
    session: authedUser,
    unlinked,
    organisationName: '[PLACEHOLDER] Gaskells Waste Services'
  }

  if (options.errors) {
    viewData.errors = options.errors
    viewData.errorSummary = Object.entries(options.errors).map(
      ([fieldName, error]) => ({
        text: error.text,
        href: `#${fieldName}`
      })
    )
  }

  return viewData
}
