import { cssClasses } from '#server/common/constants/css-classes.js'
import { formatDateShort } from '#server/common/helpers/format-date.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { buildLedgerRows } from '#server/common/helpers/waste-balance-ledger/build-ledger-rows.js'
import { paths } from '#server/paths.js'
import { CADENCE, SUBMISSION_STATUS } from '#server/reports/constants.js'
import { buildActionLinkHtml } from '#server/reports/helpers/build-action-link-html.js'
import { buildPeriodPath } from '#server/reports/helpers/build-period-path.js'
import { buildStatusTagHtml } from '#server/reports/helpers/build-status-tag-html.js'
import { formatPeriodLabelWithComma } from '#server/reports/helpers/format-period-label.js'
import { formatSubmittedDateTime } from '#server/reports/helpers/format-submitted-date-time.js'

import { eventsInYear } from './helpers/events-in-year.js'
import { registeredOnlyStretches } from '../helpers/registered-only.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { AccreditationResource, Localise } from '../helpers/types.js'
 * @import { RegistrationResource } from '#server/common/helpers/organisations/registration-resource.js'
 */

/**
 * The ledger's own rows come from the shared builder, so this page states only
 * that it has a table to render. Declared here rather than imported from the
 * accreditation page beside it, whose copy is module-private: two pages
 * happening to render one partial is not a reason to couple them.
 * @typedef {{ text: string, classes?: string } | { html: string, classes?: string }} TableCell
 * @typedef {TableCell[]} TableRow
 * @typedef {{ head: TableRow, rows: TableRow[] }} ReportsTable
 * @typedef {{ rows: TableRow[] }} LedgerTable
 * @typedef {{ text: string, href?: string }} Crumb
 * @typedef {{
 *   breadcrumbs: Crumb[],
 *   caption: string,
 *   hasData: boolean,
 *   heading: string,
 *   ledger: LedgerTable | null,
 *   pageTitle: string,
 *   reports: ReportsTable
 * }} RegisteredOnlyPeriodViewModel
 */

/**
 * An organisation trading under another name is known by it, so that is the
 * name the regulator is shown. Matches the two pages above.
 * @param {Organisation} organisation
 * @returns {string}
 */
const organisationName = ({ companyDetails }) =>
  companyDetails.tradingName?.trim() || companyDetails.name

/**
 * The records the page sits under, in the order the breadcrumbs walk them. A
 * record holding no number has nothing to name it by, so it is left out rather
 * than shown as an empty gap between two dashes.
 * @param {(string | null | undefined)[]} parts
 * @returns {string}
 */
const toCaption = (parts) => parts.filter(Boolean).join(' - ')

/**
 * The reports table's column headings, in the design's order and matching the
 * accreditation page's. The four data columns each ask for a quarter, which
 * leaves the action column to hug the one short link it holds.
 * @param {Localise} localise
 * @returns {TableRow}
 */
const toReportsHead = (localise) => [
  {
    text: localise('registrations:details:registeredOnlyPeriod:reports:period'),
    classes: cssClasses.width.oneQuarter
  },
  {
    text: localise(
      'registrations:details:registeredOnlyPeriod:reports:dueDate'
    ),
    classes: cssClasses.width.oneQuarter
  },
  {
    text: localise(
      'registrations:details:registeredOnlyPeriod:reports:submissionDate'
    ),
    classes: cssClasses.width.oneQuarter
  },
  {
    text: localise('registrations:details:registeredOnlyPeriod:reports:status'),
    classes: cssClasses.width.oneQuarter
  },
  {
    text: localise(
      'registrations:details:registeredOnlyPeriod:reports:actions'
    ),
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
    `${buildPeriodPath({ organisationId, registrationId, period, cadence: CADENCE.QUARTERLY })}/view`
  )

  return {
    html: buildActionLinkHtml(localise('reports:actionView'), url, label),
    classes: cssClasses.textAlign.right
  }
}

/**
 * One row per quarter the calendar answered with.
 *
 * A registered-only operator reports quarterly and an accredited one monthly,
 * so the calendar's cadence is what says which of the two regulator pages the
 * periods belong on: quarterly here, monthly on the accreditation page. The
 * calendar answers one cadence for the registration, so a page shown the other
 * one lists nothing rather than showing periods that are not its to show.
 *
 * That is deliberately coarser than the rule liability will eventually follow —
 * a suspended or cancelled stretch owes a registered-only report for the quarter
 * it falls in, and the calendar does not yet say so. Deciding periods from
 * status over time is its own ticket; this page shows what the operator is shown
 * until then, rather than computing a second, disagreeing answer.
 * @param {{
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   organisationId: string,
 *   registrationId: string,
 *   reportingPeriods: ReportingPeriod[]
 * }} params
 * @returns {TableRow[]}
 */
const toReportRows = ({
  localise,
  localiseUrl,
  organisationId,
  registrationId,
  reportingPeriods
}) =>
  [...reportingPeriods].sort(mostRecentFirst).map((period) => {
    const label = formatPeriodLabelWithComma(
      period,
      CADENCE.QUARTERLY,
      localise
    )

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
        label,
        localise,
        localiseUrl,
        organisationId,
        period,
        registrationId
      })
    ]
  })

/**
 * The year's own ledger, or no ledger at all where the session may not read
 * one. An empty ledger is still a ledger: the section says nothing has moved
 * the balance yet, which is a different answer from showing no section.
 *
 * The address carries no accreditation, which is what makes this the
 * registration's registered-only partition. That is also what leaves every
 * row's action cell empty, a registered-only ledger having no note to open.
 *
 * The registration cannot hold a balance while it is only registered, so the
 * rows say so rather than stating a running zero.
 * @param {{
 *   ledgerEvents: LedgerEvent[] | null | undefined,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   organisationId: string,
 *   registration: RegistrationResource,
 *   year: number
 * }} params
 * @returns {LedgerTable | null}
 */
const toLedger = ({
  ledgerEvents,
  localise,
  localiseUrl,
  organisationId,
  registration,
  year
}) => {
  if (!ledgerEvents) {
    return null
  }

  // This page reads a registration resource, which files the processing type
  // under the application it came from rather than at the top level the domain
  // model puts it.
  const { noteType } = getNoteTypeDisplayNames({
    wasteProcessingType: registration.application.wasteProcessingType
  })

  return {
    rows: buildLedgerRows({
      accreditationId: undefined,
      events: eventsInYear({ events: ledgerEvents, year }),
      holdsABalance: false,
      localise,
      localiseUrl,
      noteType,
      organisationId,
      registrationId: registration.id
    })
  }
}

/**
 * @param {{
 *   organisation: Organisation,
 *   registration: RegistrationResource,
 *   accreditations: AccreditationResource[],
 *   cadence: CadenceValue | null,
 *   reportingPeriods: ReportingPeriod[],
 *   ledgerEvents: LedgerEvent[] | null | undefined,
 *   year: number,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {RegisteredOnlyPeriodViewModel}
 */
export const buildViewModel = ({
  organisation,
  registration,
  accreditations,
  cadence,
  reportingPeriods,
  ledgerEvents,
  year,
  localise,
  localiseUrl
}) => {
  const name = organisationName(organisation)
  const registrationPath = `/organisations/${organisation.id}/registrations/${registration.id}`
  const heading = localise(
    'registrations:details:registeredOnlyPeriod:heading',
    {
      year: String(year)
    }
  )

  const stretches = registeredOnlyStretches({
    dateRange: registration.dateRange,
    accreditations,
    year
  })

  // The calendar answers one cadence for the registration. Quarterly is what a
  // registered-only operator owes, so anything else belongs to the accreditation
  // page rather than to this one.
  const quarterlyPeriods = cadence === CADENCE.QUARTERLY ? reportingPeriods : []

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
      {
        text: localise(
          'registrations:details:registeredOnlyPeriod:breadcrumb',
          { year: String(year) }
        )
      }
    ],
    caption: toCaption([name, registration.registrationNumber]),
    // A year holding no registered-only time is the page's whole subject, so
    // the answer is carried rather than the stretches that produced it.
    hasData: stretches.length > 0,
    heading,
    ledger: toLedger({
      ledgerEvents,
      localise,
      localiseUrl,
      organisationId: organisation.id,
      registration,
      year
    }),
    // The year already identifies this page, so unlike its two siblings it
    // does not prefix a record number - that would put two identifiers in
    // front of a two-word noun.
    pageTitle: heading,
    reports: {
      head: toReportsHead(localise),
      rows: toReportRows({
        localise,
        localiseUrl,
        organisationId: organisation.id,
        registrationId: registration.id,
        reportingPeriods: quarterlyPeriods
      })
    }
  }
}
