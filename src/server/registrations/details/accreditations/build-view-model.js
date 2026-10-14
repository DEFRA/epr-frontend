import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { offersWasteRecordsDownloads } from '#server/auth/waste-records-downloads.js'
import { cssClasses } from '#server/common/constants/css-classes.js'
import { escapeHtml } from '#server/common/helpers/escape-html.js'
import { formatDateShort } from '#server/common/helpers/format-date.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { buildLedgerRows } from '#server/common/helpers/waste-balance-ledger/build-ledger-rows.js'
import { toStatusTag } from '#server/organisations/helpers/status-helpers.js'
import { CADENCE } from '#server/reports/constants.js'
import { buildActionLinkHtml } from '#server/reports/helpers/build-action-link-html.js'
import {
  accreditationPath as toAccreditationPath,
  registrationPath as toRegistrationPath,
  reportPath
} from '#server/reports/helpers/report-paths.js'

import { getIssuedToOrgDisplayName } from '#server/common/helpers/waste-organisations/get-issued-to-org-display-name.js'

import { toPrnGroups } from '#server/prns/helpers/prn-groups.js'
import { buildStatusTagHtml as buildPrnStatusTagHtml } from '#server/prns/list-view-data.js'

import { buildWasteRecordsCsvDownloadPath } from '#server/registrations/waste-records-csv-download-controller.js'
import { buildSummaryLogDownloadPath } from '#server/summary-log/download-controller.js'

import { toRegistrationTrail } from '../helpers/accreditation-child-page.js'
import { organisationViewName, toCaption } from '../helpers/caption.js'
import { toDateRange } from '../helpers/date-range.js'
import { toReportRows, toReportsHead } from '../helpers/report-rows.js'
import { accreditedDateRange } from '../helpers/timeline-dates.js'

/**
 * @import { AccreditationView, OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { StatusTag } from '#server/organisations/helpers/status-helpers.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { PackagingRecyclingNote } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { Localise } from '../helpers/types.js'
 */

/**
 * @typedef {{ text: string, href?: string }} Crumb
 * @typedef {{ key: string, value: string }
 *   | { key: string, status: StatusTag }
 *   | { key: string, html: string }} SummaryRow
 * @typedef {{ text: string | number, classes?: string } | { html: string, classes?: string }} TableCell
 * @typedef {TableCell[]} TableRow
 * @typedef {{
 *   count: number,
 *   head: TableRow,
 *   href: string,
 *   rows: TableRow[]
 * }} ReportsSummary
 * @typedef {{
 *   count: number,
 *   href: string,
 *   rows: TableRow[]
 * }} LedgerTable
 * @typedef {{
 *   count: number,
 *   head: TableRow,
 *   heading: string,
 *   href: string,
 *   noneText: string,
 *   rows: TableRow[],
 *   viewAllHiddenText: string
 * }} PrnsTable
 * @typedef {{
 *   breadcrumbs: Crumb[],
 *   caption: string,
 *   heading: string,
 *   ledger: LedgerTable | null,
 *   period: string,
 *   pageTitle: string,
 *   prns: PrnsTable,
 *   reports: ReportsSummary,
 *   summaryRows: SummaryRow[]
 * }} AccreditationDetailsViewModel
 */

const MOST_RECENT = 3

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
 * so the list holds the same keys either way.
 * @param {number | undefined} amount
 * @returns {string}
 */
const toTonnage = (amount) =>
  amount === undefined ? '' : formatTonnage(amount)

/**
 * The registration's waste records, offered as a file rather than stated. The
 * records belong to the registration, not to the accreditation the page names.
 * @param {{
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   registrationPath: string
 * }} params
 * @returns {SummaryRow}
 */
const toWasteRecordsRow = ({ localise, localiseUrl, registrationPath }) => ({
  key: localise('registrations:details:accreditation:summary:wasteRecords'),
  html: `<a href="${localiseUrl(
    buildWasteRecordsCsvDownloadPath(registrationPath)
  )}" class="govuk-link">${escapeHtml(
    localise('registrations:details:accreditation:summary:download')
  )}</a>`
})

/**
 * The workbook behind the ledger's newest summary log entry, blank where
 * there is none to offer.
 * @param {{
 *   ledgerEvents: LedgerEvent[] | null,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   registrationPath: string
 * }} params
 * @returns {SummaryRow}
 */
const toLatestSummaryLogRow = ({
  ledgerEvents,
  localise,
  localiseUrl,
  registrationPath
}) => {
  const key = localise(
    'registrations:details:accreditation:summary:latestSummaryLog'
  )
  const latest = ledgerEvents?.findLast((event) => event.summaryLog)

  if (!latest?.summaryLog) {
    return { key, value: '' }
  }

  return {
    key,
    html: `<a href="${localiseUrl(
      buildSummaryLogDownloadPath({
        registrationPath,
        fileId: latest.summaryLog.id
      })
    )}" class="govuk-link">${escapeHtml(
      localise('registrations:details:accreditation:summary:download')
    )}</a>`
  }
}

/**
 * @param {{
 *   accreditation: AccreditationView,
 *   ledgerEvents: LedgerEvent[] | null,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   registrationPath: string,
 *   wasteBalance: WasteBalance | null
 * }} params
 * @returns {SummaryRow[]}
 */
const toSummaryRows = ({
  accreditation,
  ledgerEvents,
  localise,
  localiseUrl,
  registrationPath,
  wasteBalance
}) => [
  {
    key: localise('registrations:details:accreditation:summary:status'),
    status: toStatusTag(accreditation.status)
  },
  {
    key: localise('registrations:details:accreditation:summary:number'),
    value: accreditation.accreditationNumber
  },
  {
    key: localise(
      'registrations:details:accreditation:summary:wasteBalanceAvailable'
    ),
    value: toTonnage(wasteBalance?.availableAmount)
  },
  toLatestSummaryLogRow({
    ledgerEvents,
    localise,
    localiseUrl,
    registrationPath
  }),
  // The page is regulator-only, so the flag is the whole question here.
  ...(offersWasteRecordsDownloads()
    ? [toWasteRecordsRow({ localise, localiseUrl, registrationPath })]
    : [])
]

/**
 * The PRNs section's column headings, in the design's order.
 * @param {Localise} localise
 * @returns {TableRow}
 */
const toPrnsHead = (localise) => [
  { text: localise('registrations:details:accreditation:prns:recipient') },
  { text: localise('registrations:details:accreditation:prns:status') },
  { text: localise('registrations:details:accreditation:prns:date') },
  { text: localise('registrations:details:accreditation:prns:tonnage') },
  {
    text: localise('registrations:details:accreditation:prns:action'),
    classes: cssClasses.textAlign.right
  }
]

/**
 * The three most recent notes, and where to read the rest. An unissued note's
 * row falls back to its created date, so the column is headed neutrally.
 * @param {{
 *   accreditationPath: string,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   noteTypePlural: string,
 *   notes: PackagingRecyclingNote[]
 * }} params
 * @returns {PrnsTable}
 */
const toPrns = ({
  accreditationPath,
  localise,
  localiseUrl,
  noteTypePlural,
  notes
}) => {
  const { mostRecent } = toPrnGroups(notes)
  const notesPath = `${accreditationPath}/packaging-recycling-notes`

  return {
    count: mostRecent.length,
    head: toPrnsHead(localise),
    heading: localise('registrations:details:accreditation:prns:heading', {
      noteTypePlural
    }),
    href: localiseUrl(notesPath),
    noneText: localise('registrations:details:accreditation:prns:none', {
      noteTypePlural
    }),
    viewAllHiddenText: localise(
      'registrations:details:accreditation:prns:viewAllHidden',
      { noteTypePlural }
    ),
    rows: mostRecent.map((note) => {
      const date = formatDateShort(note.issuedAt ?? note.createdAt)

      return [
        { text: getIssuedToOrgDisplayName(note.issuedToOrganisation) },
        { html: buildPrnStatusTagHtml(note.status, localise) },
        { text: date },
        { text: note.tonnage },
        {
          html: buildActionLinkHtml(
            localise('registrations:details:accreditation:prns:view'),
            localiseUrl(`${notesPath}/${note.id}/view`),
            note.prnNumber ?? date
          ),
          classes: cssClasses.textAlign.right
        }
      ]
    })
  }
}

/**
 * The three most recent reporting periods, and where to read the rest.
 * @param {{
 *   cadence: CadenceValue | null,
 *   keys: AccreditationKeys,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   reportingPeriods: ReportingPeriod[]
 * }} params
 * @returns {ReportsSummary}
 */
const toReportsSummary = ({
  cadence,
  keys,
  localise,
  localiseUrl,
  reportingPeriods
}) => {
  // The calendar answers one cadence for the registration: quarterly periods
  // belong to the registered-only page, and no cadence means an unread calendar.
  const monthlyPeriods = cadence === CADENCE.MONTHLY ? reportingPeriods : []
  const rows = toReportRows({
    cadence: CADENCE.MONTHLY,
    localise,
    localiseUrl,
    periodPath: (period) =>
      reportPath({
        organisationNumber: keys.organisationNumber,
        registrationNumber: keys.registrationNumber,
        year: period.year,
        cadence: CADENCE.MONTHLY,
        period: period.period,
        submissionNumber: period.submissionNumber
      }),
    reportingPeriods: monthlyPeriods
  }).slice(0, MOST_RECENT)

  return {
    count: rows.length,
    head: toReportsHead({
      localise,
      namespace: 'registrations:details:accreditation:reports'
    }),
    href: localiseUrl(`${toAccreditationPath(keys)}/reports`),
    rows
  }
}

/**
 * The most recent events of the accreditation's own ledger, and where to read
 * the rest, or no ledger at all where the session may not read one. An empty
 * ledger is still a ledger: the section says nothing has moved the balance yet.
 * @param {{
 *   accreditationPath: string,
 *   ledgerEvents: LedgerEvent[] | null,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   registration: RegistrationView,
 *   registrationPath: string
 * }} params
 * @returns {LedgerTable | null}
 */
const toLedger = ({
  accreditationPath,
  ledgerEvents,
  localise,
  localiseUrl,
  registration,
  registrationPath
}) => {
  if (ledgerEvents === null) {
    return null
  }

  const { noteType } = getNoteTypeDisplayNames(registration)

  // The rows are already newest first, so the slice keeps the newest.
  const rows = buildLedgerRows({
    accreditationPath,
    events: ledgerEvents,
    localise,
    localiseUrl,
    noteType,
    // The page is regulator-only, so the flag is the whole question here.
    offersCsvDownloads: offersWasteRecordsDownloads(),
    offersDownloads: true,
    registrationPath
  }).slice(0, MOST_RECENT)

  return {
    count: rows.length,
    href: localiseUrl(`${accreditationPath}/waste-balance-ledger`),
    rows
  }
}

/**
 * @param {{
 *   keys: AccreditationKeys,
 *   organisation: OrganisationView,
 *   registration: RegistrationView,
 *   accreditation: AccreditationView,
 *   wasteBalance: WasteBalance | null,
 *   reportingPeriods: ReportingPeriod[],
 *   cadence: CadenceValue | null,
 *   ledgerEvents: LedgerEvent[] | null,
 *   packagingRecyclingNotes: PackagingRecyclingNote[],
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {AccreditationDetailsViewModel}
 */
export const buildViewModel = ({
  keys,
  organisation,
  registration,
  accreditation,
  wasteBalance,
  reportingPeriods,
  cadence,
  ledgerEvents,
  packagingRecyclingNotes,
  localise,
  localiseUrl
}) => {
  const name = organisationViewName(organisation)
  const pageName = localise('registrations:details:accreditation:breadcrumb')
  const paths = {
    organisation: `/organisations/${encodeURIComponent(keys.organisationNumber)}`,
    registration: toRegistrationPath(keys),
    accreditation: toAccreditationPath(keys)
  }

  return {
    breadcrumbs: [
      ...toRegistrationTrail({
        localise,
        localiseUrl,
        organisationName: name,
        paths
      }),
      { text: pageName }
    ],
    caption: toCaption([
      name,
      keys.registrationNumber,
      accreditation.accreditationNumber
    ]),
    heading: localise('registrations:details:accreditation:heading'),
    ledger: toLedger({
      accreditationPath: paths.accreditation,
      ledgerEvents,
      localise,
      localiseUrl,
      registration,
      registrationPath: paths.registration
    }),
    period: toDateRange(
      accreditedDateRange(accreditation, keys.year),
      localise
    ),
    pageTitle: `${accreditation.accreditationNumber}: ${pageName}`,
    prns: toPrns({
      accreditationPath: paths.accreditation,
      localise,
      localiseUrl,
      noteTypePlural: getNoteTypeDisplayNames(registration).noteTypePlural,
      notes: packagingRecyclingNotes
    }),
    reports: toReportsSummary({
      cadence,
      keys,
      localise,
      localiseUrl,
      reportingPeriods
    }),
    summaryRows: toSummaryRows({
      accreditation,
      ledgerEvents,
      localise,
      localiseUrl,
      registrationPath: paths.registration,
      wasteBalance
    })
  }
}
