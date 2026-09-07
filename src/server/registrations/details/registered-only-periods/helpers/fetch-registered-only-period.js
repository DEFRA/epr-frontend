import { fetchLedgerEvents } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
import { fetchReportingPeriods } from '#server/reports/helpers/fetch-reporting-periods.js'

import { fetchRegistrationDetails } from '../../helpers/fetch-registration-details.js'

/**
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { RegistrationDetails } from '../../helpers/fetch-registration-details.js'
 */

/**
 * @typedef {{
 *   cadence: CadenceValue | null,
 *   reportingPeriods: ReportingPeriod[]
 * }} ReportingCalendar
 */

/**
 * @typedef {RegistrationDetails & ReportingCalendar & {
 *   ledgerEvents: LedgerEvent[] | null
 * }} RegisteredOnlyPeriodDetails
 */

/**
 * The reporting calendar, from the same address the operator's own reports page
 * reads. Deliberately asked nothing further: what a registration owes is the
 * backend's to decide, and one endpoint answering both audiences is what keeps
 * a regulator seeing what the operator sees.
 *
 * `fetchReportingPeriods` raises rather than answering a failure, and the catch
 * belongs here rather than in it: the operator's own page shares that helper,
 * and a swallowed error there would silently empty their table. A calendar this
 * page could not read renders as no periods, so downstream has one empty case to
 * build and to test rather than two.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   backendToken: string,
 *   logger: TypedLogger
 * }} params
 * @returns {Promise<ReportingCalendar>}
 */
const fetchCalendar = async ({
  organisationId,
  registrationId,
  backendToken,
  logger
}) => {
  try {
    return await fetchReportingPeriods(
      organisationId,
      registrationId,
      backendToken
    )
  } catch (error) {
    logger.error({
      message: `Failed to fetch the reporting calendar for organisation ${organisationId} registration ${registrationId}`,
      err: error
    })

    return { cadence: null, reportingPeriods: [] }
  }
}

/**
 * The registered-only ledger, read from the address naming no accreditation,
 * or null for a session the backend would refuse anyway.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   backendToken: string,
 *   canReadLedger: boolean
 * }} params
 * @returns {Promise<LedgerEvent[] | null>}
 */
const fetchLedger = ({
  canReadLedger,
  organisationId,
  registrationId,
  backendToken
}) =>
  canReadLedger
    ? fetchLedgerEvents({
        organisationId,
        registrationId,
        accreditationId: undefined,
        backendToken
      })
    : Promise.resolve(null)

/**
 * The registration, the reporting calendar and the ledger, read together.
 *
 * Unlike the calendar, a failed ledger read is not caught: it is the record the
 * page exists to show.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   backendToken: string,
 *   canReadLedger: boolean,
 *   logger: TypedLogger
 * }} params
 * @returns {Promise<RegisteredOnlyPeriodDetails>}
 */
export const fetchRegisteredOnlyPeriod = async (params) => {
  const [details, calendar, ledgerEvents] = await Promise.all([
    fetchRegistrationDetails(params),
    fetchCalendar(params),
    fetchLedger(params)
  ])

  return { ...details, ...calendar, ledgerEvents }
}
