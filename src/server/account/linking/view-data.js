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
      displayName: `${o.name} (ID: ${o.orgId})`,
      name: o.name
    }))

  const troubleshooting = {
    summary: request.t('account:linking:troubleshooting:summary'),
    missing: {
      heading: request.t('account:linking:troubleshooting:missingHeading'),
      bodyOne: request.t('account:linking:troubleshooting:missingBodyOne'),
      bodyTwo: request.t('account:linking:troubleshooting:missingBodyTwo')
    },
    otherProblems: {
      heading: request.t(
        'account:linking:troubleshooting:otherProblemsHeading'
      ),
      bodyOne: request.t(
        'account:linking:troubleshooting:otherProblemsBodyOne'
      ),
      bodyTwo: request.t(
        'account:linking:troubleshooting:otherProblemsBodyTwo'
      ),
      email: request.t('account:linking:troubleshooting:otherProblemsEmail'),
      bodyThree: request.t(
        'account:linking:troubleshooting:otherProblemsBodyThree'
      )
    }
  }

  const viewData = {
    pageTitle: request.t('account:linking:pageTitle'),
    unlinked,
    organisationName: organisations.current.name,
    troubleshooting
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
