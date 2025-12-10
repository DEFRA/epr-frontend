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
  // TODO assert this value and throw if not set
  const { organisations } = authedUser

  // TODO is this the companies house number or something else?
  // FIXME is this an optional field in the data? do we need a fallback or to omit it?
  const unlinked = organisations.unlinked.map((o) => ({
    id: o.id,
    name: `${o.name} (ID: ${o.companiesHouseNumber})`
  }))

  const viewData = {
    pageTitle: request.t('account:linking:pageTitle'),
    unlinked,
    organisationName: organisations.current.name
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
