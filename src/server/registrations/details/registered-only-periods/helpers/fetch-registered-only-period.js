import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { fetchOrganisation } from '#server/common/helpers/organisations/fetch-organisation.js'
import { registrationIn } from '#server/common/helpers/organisations/registration-in-view.js'
import { fetchRegisteredOnlyLedgerEvents } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
import { fetchReportingPeriodsByNumber } from '#server/reports/helpers/fetch-reporting-periods.js'

/**
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @typedef {{
 *   cadence: CadenceValue | null,
 *   reportingPeriods: ReportingPeriod[]
 * }} ReportingCalendar
 */

/**
 * @typedef {ReportingCalendar & {
 *   organisation: OrganisationView,
 *   registration: RegistrationView,
 *   ledgerEvents: LedgerEvent[] | null
 * }} RegisteredOnlyPeriodDetails
 */

/**
 * @typedef {RegistrationKeys & {
 *   year: number,
 *   backendToken: string,
 *   canReadLedger: boolean,
 *   logger: TypedLogger
 * }} RegisteredOnlyPeriodRequest
 */

/**
 * The reporting calendar, from the same address the operator's own reports page
 * reads. Deliberately asked nothing further: what a registration owes is the
 * backend's to decide, and one endpoint answering both audiences is what keeps
 * a regulator seeing what the operator sees.
 *
 * `fetchReportingPeriodsByNumber` raises rather than answering a failure, and
 * the catch belongs here rather than in it: the operator's own page shares that
 * helper, and a swallowed error there would silently empty their table. A
 * calendar this page could not read renders as no periods, so downstream has
 * one empty case to build and to test rather than two.
 * @param {{ keys: RegistrationKeys, backendToken: string, logger: TypedLogger }} params
 * @returns {Promise<ReportingCalendar>}
 */
const fetchCalendar = async ({ keys, backendToken, logger }) => {
  try {
    return await fetchReportingPeriodsByNumber(keys, backendToken)
  } catch (error) {
    logger.error({
      message: `Failed to fetch the reporting calendar for organisation ${keys.organisationNumber} registration ${keys.registrationNumber}`,
      err: error
    })

    return { cadence: null, reportingPeriods: [] }
  }
}

/**
 * The year's registered-only ledger: null without the read scope, empty for a year never approved.
 * @param {{
 *   keys: RegistrationKeys,
 *   year: number,
 *   backendToken: string,
 *   canReadLedger: boolean
 * }} params
 * @returns {Promise<LedgerEvent[] | null>}
 */
const fetchLedger = async ({ keys, year, backendToken, canReadLedger }) => {
  if (!canReadLedger) {
    return null
  }

  try {
    return await fetchRegisteredOnlyLedgerEvents(
      { ...keys, year: String(year) },
      backendToken
    )
  } catch (error) {
    if (Boom.isBoom(error, statusCodes.notFound)) {
      return []
    }

    throw error
  }
}

/**
 * The registration from the organisation read model.
 * @param {{ keys: RegistrationKeys, backendToken: string }} params
 * @returns {Promise<{ organisation: OrganisationView, registration: RegistrationView }>}
 */
const fetchRegistration = async ({ keys, backendToken }) => {
  const organisation = await fetchOrganisation(
    organisationNumber(Number(keys.organisationNumber)),
    backendToken
  )

  return {
    organisation,
    registration: registrationIn(organisation, keys.registrationNumber)
  }
}

/**
 * The registration, the reporting calendar and the ledger, read together.
 *
 * Unlike the calendar, a failed ledger read is not caught: it is the record the
 * page exists to show.
 * @param {RegisteredOnlyPeriodRequest} params
 * @returns {Promise<RegisteredOnlyPeriodDetails>}
 */
export const fetchRegisteredOnlyPeriod = async ({
  year,
  backendToken,
  canReadLedger,
  logger,
  ...keys
}) => {
  const [details, calendar, ledgerEvents] = await Promise.all([
    fetchRegistration({ keys, backendToken }),
    fetchCalendar({ keys, backendToken, logger }),
    fetchLedger({ keys, year, backendToken, canReadLedger })
  ])

  return { ...details, ...calendar, ledgerEvents }
}
