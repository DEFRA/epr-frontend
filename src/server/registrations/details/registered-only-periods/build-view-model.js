/** @import { ReportsTable } from '../helpers/report-rows.js'; */
/** @import { TableRow } from '../helpers/report-rows.js'; */
import { offersWasteRecordsDownloads } from '#server/auth/waste-records-downloads.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { buildLedgerRows } from '#server/common/helpers/waste-balance-ledger/build-ledger-rows.js'
import { paths } from '#server/paths.js'
import { CADENCE } from '#server/reports/constants.js'

import { eventsInYear } from './helpers/events-in-year.js'
import { organisationName, toCaption } from '../helpers/caption.js'
import { registeredOnlyStretches } from '../helpers/registered-only.js'
import { toReportRows, toReportsHead } from '../helpers/report-rows.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { AccreditationResource, Localise } from '../helpers/types.js'
 * @import { RegistrationResource } from '#server/common/helpers/organisations/registration-resource.js'
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

  // The resource files the processing type under its application, not at the
  // top level the domain model uses.
  const { noteType } = getNoteTypeDisplayNames({
    wasteProcessingType: registration.application.wasteProcessingType
  })

  return {
    rows: buildLedgerRows({
      events: eventsInYear({ events: ledgerEvents, year }),
      holdsABalance: false,
      localise,
      localiseUrl,
      noteType,
      // The page is regulator-only, so the flag is the whole question here.
      offersCsvDownloads: offersWasteRecordsDownloads(),
      offersDownloads: true,
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
      head: toReportsHead({
        localise,
        namespace: 'registrations:details:registeredOnlyPeriod:reports'
      }),
      rows: toReportRows({
        cadence: CADENCE.QUARTERLY,
        localise,
        localiseUrl,
        organisationId: organisation.id,
        registrationId: registration.id,
        reportingPeriods: quarterlyPeriods
      })
    }
  }
}
