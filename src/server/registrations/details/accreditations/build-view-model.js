import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { toStatusTag } from '#server/organisations/helpers/status-helpers.js'
import { paths } from '#server/paths.js'

import { toDateRange } from '../helpers/date-range.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { StatusTag } from '#server/organisations/helpers/status-helpers.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 * @import { AccreditationResource } from '../helpers/types.js'
 */

/**
 * @typedef {(key: string, options?: Record<string, string>) => string} Localise
 * @typedef {{ text: string, href?: string }} Crumb
 * @typedef {{ key: string, value: string } | { key: string, status: StatusTag }} SummaryRow
 * @typedef {{
 *   breadcrumbs: Crumb[],
 *   caption: string,
 *   heading: string,
 *   pageTitle: string,
 *   summaryRows: SummaryRow[]
 * }} AccreditationDetailsViewModel
 */

/**
 * An organisation trading under another name is known by it, so that is the
 * name the regulator is shown. Matches the registration page above.
 * @param {Organisation} organisation
 * @returns {string}
 */
const organisationName = ({ companyDetails }) =>
  companyDetails.tradingName?.trim() || companyDetails.name

/**
 * The three records the page sits under, in the order the breadcrumbs walk
 * them. A record that holds no number has nothing to name it by, so it is left
 * out rather than shown as an empty gap between two dashes.
 * @param {(string | null | undefined)[]} parts
 * @returns {string}
 */
const toCaption = (parts) => parts.filter(Boolean).join(' - ')

/**
 * The validity period is the heading. An accreditation that has not been
 * approved names no period, so the heading is the page's own name alone.
 * @param {AccreditationResource} accreditation
 * @param {Localise} localise
 * @returns {string}
 */
const toHeading = (accreditation, localise) => {
  const name = localise('registrations:details:accreditation:heading')
  const period = toDateRange(accreditation.dateRange, localise)

  return period ? `${name} ${period}` : name
}

/**
 * The balance not already committed to a note. `availableAmount` falls when a
 * PRN is created rather than when it is issued, so tonnage a note has been
 * drawn against stops counting as available from the moment it is spoken for.
 * The total the accreditation has ever held is deliberately not shown beside
 * it: a regulator asks what is left, and two tonnages invite the wrong one to
 * be read.
 *
 * A tonnage the page could not read is left blank rather than shown as zero,
 * which would read as a balance spent down to nothing. The row itself stays,
 * so the list holds the same three keys either way.
 * @param {number | undefined} amount
 * @returns {string}
 */
const toTonnage = (amount) =>
  amount === undefined ? '' : formatTonnage(amount)

/**
 * @param {AccreditationResource} accreditation
 * @param {WasteBalance | null} wasteBalance
 * @param {Localise} localise
 * @returns {SummaryRow[]}
 */
const toSummaryRows = (accreditation, wasteBalance, localise) => [
  {
    key: localise('registrations:details:accreditation:summary:status'),
    status: toStatusTag(accreditation.status)
  },
  {
    key: localise('registrations:details:accreditation:summary:number'),
    value: accreditation.accreditationNumber ?? ''
  },
  {
    key: localise(
      'registrations:details:accreditation:summary:wasteBalanceAvailable'
    ),
    value: toTonnage(wasteBalance?.availableAmount)
  }
]

/**
 * @param {{
 *   organisation: Organisation,
 *   registration: Registration,
 *   accreditation: AccreditationResource,
 *   wasteBalance: WasteBalance | null,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {AccreditationDetailsViewModel}
 */
export const buildViewModel = ({
  organisation,
  registration,
  accreditation,
  wasteBalance,
  localise,
  localiseUrl
}) => {
  const name = organisationName(organisation)
  const registrationPath = `/organisations/${organisation.id}/registrations/${registration.id}`
  const pageName = localise('registrations:details:accreditation:breadcrumb')

  return {
    breadcrumbs: [
      {
        text: localise('registrations:details:allOrganisations'),
        href: localiseUrl(paths.regulators.home)
      },
      { text: name, href: localiseUrl(`/organisations/${organisation.id}`) },
      {
        text: localise('registrations:details:heading'),
        href: localiseUrl(registrationPath)
      },
      { text: pageName }
    ],
    caption: toCaption([
      name,
      registration.registrationNumber,
      accreditation.accreditationNumber
    ]),
    heading: toHeading(accreditation, localise),
    pageTitle: accreditation.accreditationNumber
      ? `${accreditation.accreditationNumber}: ${pageName}`
      : pageName,
    summaryRows: toSummaryRows(accreditation, wasteBalance, localise)
  }
}
