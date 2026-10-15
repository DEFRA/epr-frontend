import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
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
 * The year's registered-only ledger: null without the read scope, empty when the backend has none.
 * @param {{
 *   keys: RegistrationKeys,
 *   year: number,
 *   backendToken: string,
 *   canReadLedger: boolean,
 *   logger: TypedLogger
 * }} params
 * @returns {Promise<LedgerEvent[] | null>}
 */
const fetchLedger = async ({
  keys,
  year,
  backendToken,
  canReadLedger,
  logger
}) => {
  if (!canReadLedger) {
    return null
  }

  try {
    return await fetchRegisteredOnlyLedgerEvents(
      { ...keys, year: String(year) },
      backendToken
    )
  } catch (error) {
    if (!Boom.isBoom(error, statusCodes.notFound)) {
      throw error
    }

    logger.info({
      message: 'No registered-only ledger for the year, showing it empty',
      event: {
        action: 'fetch_registered_only_ledger',
        reason: `organisationNumber=${keys.organisationNumber} registrationNumber=${keys.registrationNumber} year=${year}`
      }
    })

    return []
  }
}

/**
 * The registration from the organisation read model; an unknown organisation is a registration not found.
 * @param {{ keys: RegistrationKeys, backendToken: string }} params
 * @returns {Promise<{ organisation: OrganisationView, registration: RegistrationView }>}
 */
const fetchRegistration = async ({ keys, backendToken }) => {
  const organisation = await fetchOrganisation(
    organisationNumber(Number(keys.organisationNumber)),
    backendToken
  ).catch((error) => {
    if (!Boom.isBoom(error, statusCodes.notFound)) {
      throw error
    }

    throw notFound('Registration not found', errorCodes.registrationNotFound, {
      event: {
        action: 'fetch_registration',
        reason: `organisationNumber=${keys.organisationNumber} registrationNumber=${keys.registrationNumber}`
      }
    })
  })

  return {
    organisation,
    registration: registrationIn(organisation, keys.registrationNumber)
  }
}

/**
 * The registration, calendar and ledger together; a 404 ledger reads as empty (a product decision), any other ledger failure fails the page.
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
    fetchLedger({ keys, year, backendToken, canReadLedger, logger })
  ])

  return { ...details, ...calendar, ledgerEvents }
}
