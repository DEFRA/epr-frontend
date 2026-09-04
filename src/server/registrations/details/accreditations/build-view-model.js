import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { cssClasses } from '#server/common/constants/css-classes.js'
import { formatDateShort } from '#server/common/helpers/format-date.js'
import { toStatusTag } from '#server/organisations/helpers/status-helpers.js'
import { paths } from '#server/paths.js'
import { CADENCE, SUBMISSION_STATUS } from '#server/reports/constants.js'
import { buildActionLinkHtml } from '#server/reports/helpers/build-action-link-html.js'
import { buildPeriodPath } from '#server/reports/helpers/build-period-path.js'
import { buildStatusTagHtml } from '#server/reports/helpers/build-status-tag-html.js'
import { formatPeriodLabelWithComma } from '#server/reports/helpers/format-period-label.js'
import { formatSubmittedDateTime } from '#server/reports/helpers/format-submitted-date-time.js'

import { toDateRange } from '../helpers/date-range.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { StatusTag } from '#server/organisations/helpers/status-helpers.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { AccreditationResource, Localise } from '../helpers/types.js'
 */

/**
 * @typedef {{ text: string, href?: string }} Crumb
 * @typedef {{ key: string, value: string } | { key: string, status: StatusTag }} SummaryRow
 * @typedef {{ text: string, classes?: string } | { html: string, classes?: string }} TableCell
 * @typedef {TableCell[]} TableRow
 * @typedef {{ head: TableRow, rows: TableRow[] }} ReportsTable
 * @typedef {{
 *   breadcrumbs: Crumb[],
 *   caption: string,
 *   heading: string,
 *   period: string,
 *   pageTitle: string,
 *   reports: ReportsTable,
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
 * The reports table's column headings, in the design's order. The four data
 * columns each ask for a quarter, which leaves the action column to hug the one
 * short link it holds.
 * @param {Localise} localise
 * @returns {TableRow}
 */
const toReportsHead = (localise) => [
  {
    text: localise('registrations:details:accreditation:reports:period'),
    classes: cssClasses.width.oneQuarter
  },
  {
    text: localise('registrations:details:accreditation:reports:dueDate'),
    classes: cssClasses.width.oneQuarter
  },
  {
    text: localise(
      'registrations:details:accreditation:reports:submissionDate'
    ),
    classes: cssClasses.width.oneQuarter
  },
  {
    text: localise('registrations:details:accreditation:reports:status'),
    classes: cssClasses.width.oneQuarter
  },
  {
    text: localise('registrations:details:accreditation:reports:actions'),
    classes: cssClasses.textAlign.right
  }
]

/**
 * A regulator opens this page to read what happened lately, so the newest
 * period leads. The order the calendar answered in is not relied on.
 * @param {ReportingPeriod} a
 * @param {ReportingPeriod} b
 * @returns {number}
 */
const mostRecentFirst = (a, b) => b.year - a.year || b.period - a.period

/**
 * Only a submitted period has a report to read, so every other row's action
 * cell is empty rather than linking at nothing. The link carries the period it
 * belongs to, so a page of otherwise identical links stays distinguishable.
 * @param {{
 *   cadence: CadenceValue,
 *   label: string,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   organisationId: string,
 *   period: ReportingPeriod,
 *   registrationId: string
 * }} params
 * @returns {TableCell}
 */
const toActionCell = ({
  cadence,
  label,
  localise,
  localiseUrl,
  organisationId,
  period,
  registrationId
}) => {
  if (period.periodStatus !== SUBMISSION_STATUS.SUBMITTED) {
    return { text: '', classes: cssClasses.textAlign.right }
  }

  const url = localiseUrl(
    `${buildPeriodPath({ organisationId, registrationId, period, cadence })}/view`
  )

  return {
    html: buildActionLinkHtml(localise('reports:actionView'), url, label),
    classes: cssClasses.textAlign.right
  }
}

/**
 * One row per reporting period the accreditation owes.
 *
 * An accredited operator reports monthly and a registered-only one quarterly,
 * so the calendar's cadence is what says which of the two regulator pages the
 * periods belong on: monthly here, quarterly on the registered-only period's
 * page. The calendar answers one cadence for the registration, so an
 * accreditation whose registration currently owes quarterly reports lists none
 * here rather than showing periods that are not its to show.
 *
 * A calendar the page could not read arrives as no periods and no cadence, and
 * a period cannot be named without the cadence that says whether it is a month
 * or a quarter, so that answers no rows either.
 * @param {{
 *   cadence: CadenceValue | null,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   organisationId: string,
 *   registrationId: string,
 *   reportingPeriods: ReportingPeriod[]
 * }} params
 * @returns {TableRow[]}
 */
const toReportRows = ({
  cadence,
  localise,
  localiseUrl,
  organisationId,
  registrationId,
  reportingPeriods
}) => {
  if (cadence !== CADENCE.MONTHLY) {
    return []
  }

  return [...reportingPeriods].sort(mostRecentFirst).map((period) => {
    const label = formatPeriodLabelWithComma(period, cadence, localise)

    return [
      { text: label },
      { text: formatDateShort(period.dueDate) },
      { text: formatSubmittedDateTime(period.report?.submittedAt) },
      {
        html: buildStatusTagHtml(
          period.periodStatus,
          localise,
          period.submissionNumber
        )
      },
      toActionCell({
        cadence,
        label,
        localise,
        localiseUrl,
        organisationId,
        period,
        registrationId
      })
    ]
  })
}

/**
 * @param {{
 *   organisation: Organisation,
 *   registration: Registration,
 *   accreditation: AccreditationResource,
 *   wasteBalance: WasteBalance | null,
 *   reportingPeriods: ReportingPeriod[],
 *   cadence: CadenceValue | null,
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
  reportingPeriods,
  cadence,
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
    heading: localise('registrations:details:accreditation:heading'),
    period: toDateRange(accreditation.dateRange, localise),
    pageTitle: accreditation.accreditationNumber
      ? `${accreditation.accreditationNumber}: ${pageName}`
      : pageName,
    reports: {
      head: toReportsHead(localise),
      rows: toReportRows({
        cadence,
        localise,
        localiseUrl,
        organisationId: organisation.id,
        registrationId: registration.id,
        reportingPeriods
      })
    },
    summaryRows: toSummaryRows(accreditation, wasteBalance, localise)
  }
}
