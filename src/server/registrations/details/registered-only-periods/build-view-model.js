/** @import { ReportsTable } from '../helpers/report-rows.js'; */
/** @import { TableRow } from '../helpers/report-rows.js'; */
import { offersWasteRecordsDownloads } from '#server/auth/waste-records-downloads.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { buildLedgerRows } from '#server/common/helpers/waste-balance-ledger/build-ledger-rows.js'
import { paths } from '#server/paths.js'
import { CADENCE } from '#server/reports/constants.js'
import {
  organisationPath,
  registrationPath as toRegistrationPath,
  reportPath
} from '#server/reports/helpers/report-paths.js'

import { toCaption } from '../helpers/caption.js'
import { registeredOnlyStretches } from '../helpers/registered-only.js'
import { toReportRows, toReportsHead } from '../helpers/report-rows.js'
import {
  registeredStretches,
  registrationAccreditedStretches
} from '../helpers/timeline-dates.js'

/**
 * @import { OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { Localise } from '../helpers/types.js'
 */

/**
 * @typedef {TableRow} TableRow
 * @typedef {ReportsTable} ReportsTable
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
 * The year's own ledger, or null where the session may not read one. An empty
 * ledger is still a ledger - the section says nothing has moved it yet.
 * @param {{
 *   ledgerEvents: LedgerEvent[] | null | undefined,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   registration: RegistrationView,
 *   registrationPath: string
 * }} params
 * @returns {LedgerTable | null}
 */
const toLedger = ({
  ledgerEvents,
  localise,
  localiseUrl,
  registration,
  registrationPath
}) => {
  if (!ledgerEvents) {
    return null
  }

  const { noteType } = getNoteTypeDisplayNames(registration)

  return {
    rows: buildLedgerRows({
      events: ledgerEvents,
      holdsABalance: false,
      localise,
      localiseUrl,
      noteType,
      // The page is regulator-only, so the flag is the whole question here.
      offersCsvDownloads: offersWasteRecordsDownloads(),
      offersDownloads: true,
      registrationPath
    })
  }
}

/**
 * @param {{
 *   keys: RegistrationKeys,
 *   name: string,
 *   registrationAddress: string,
 *   year: number,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string
 * }} params
 * @returns {Crumb[]}
 */
const toBreadcrumbs = ({
  keys,
  name,
  registrationAddress,
  year,
  localise,
  localiseUrl
}) => [
  {
    text: localise('registrations:details:allOrganisations'),
    href: localiseUrl(paths.regulators.home)
  },
  {
    text: name,
    href: localiseUrl(organisationPath(keys))
  },
  {
    text: localise('registrations:details:heading'),
    href: localiseUrl(registrationAddress)
  },
  {
    text: localise('registrations:details:registeredOnlyPeriod:breadcrumb', {
      year: String(year)
    })
  }
]

/**
 * @param {{
 *   organisation: OrganisationView,
 *   registration: RegistrationView,
 *   keys: RegistrationKeys,
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
  keys,
  cadence,
  reportingPeriods,
  ledgerEvents,
  year,
  localise,
  localiseUrl
}) => {
  const name = organisation.displayName
  const registrationAddress = toRegistrationPath(keys)
  const heading = localise(
    'registrations:details:registeredOnlyPeriod:heading',
    {
      year: String(year)
    }
  )

  const stretches = registeredOnlyStretches({
    registered: registeredStretches(registration, year),
    accredited: registrationAccreditedStretches(registration)
  })

  // The calendar answers one cadence for the registration. Quarterly is what a
  // registered-only operator owes, so anything else belongs to the accreditation
  // page rather than to this one.
  const quarterlyPeriods = cadence === CADENCE.QUARTERLY ? reportingPeriods : []

  return {
    breadcrumbs: toBreadcrumbs({
      keys,
      name,
      registrationAddress,
      year,
      localise,
      localiseUrl
    }),
    caption: toCaption([name, keys.registrationNumber]),
    // A year holding no registered-only time is the page's whole subject, so
    // the answer is carried rather than the stretches that produced it.
    hasData: stretches.length > 0,
    heading,
    ledger: toLedger({
      ledgerEvents,
      localise,
      localiseUrl,
      registration,
      registrationPath: registrationAddress
    }),
    // The year already identifies this page, so unlike its two siblings it
    // does not prefix a record number - that would put two identifiers in
    // front of a two-word noun.
    pageTitle: heading,
    reports: {
      head: toReportsHead({
        localise,
        namespace: 'registrations:details:registeredOnlyPeriod:reports'
      }),
      rows: toReportRows({
        cadence: CADENCE.QUARTERLY,
        localise,
        localiseUrl,
        periodPath: (period) =>
          reportPath({
            ...keys,
            year: period.year,
            cadence: CADENCE.QUARTERLY,
            period: period.period,
            submissionNumber: period.submissionNumber
          }),
        reportingPeriods: quarterlyPeriods
      })
    }
  }
}
