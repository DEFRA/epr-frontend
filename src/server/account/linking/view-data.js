/**
 * @import { Request } from '@hapi/hapi'
 * @import { UserOrganisations } from '#server/auth/types/organisations.js'
 */

/**
 * Build view data for the account linking page
 * @param {Request} request
 * @param {UserOrganisations} organisations
 * @param {object} [options]
 * @param {object} [options.errors]
 * @returns {object}
 */
export function buildLinkingViewData(request, organisations, options = {}) {
  const unlinked = organisations.unlinked
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map((o) => ({
      id: o.id,
      name: `${o.name} (ID: ${o.orgId})`
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
