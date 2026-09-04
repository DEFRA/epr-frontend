import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { fetchLedgerEvents } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
import { fetchReportingPeriods } from '#server/reports/helpers/fetch-reporting-periods.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { AccreditationResource } from '../../helpers/types.js'
 */

/**
 * @typedef {{
 *   cadence: CadenceValue | null,
 *   reportingPeriods: ReportingPeriod[]
 * }} ReportingCalendar
 */

/**
 * @typedef {{
 *   organisation: Organisation,
 *   registration: Registration,
 *   accreditation: AccreditationResource,
 *   wasteBalance: WasteBalance | null,
 *   reportingPeriods: ReportingPeriod[],
 *   cadence: CadenceValue | null,
 *   ledgerEvents: LedgerEvent[] | null
 * }} AccreditationDetails
 */

/**
 * @param {string} backendToken
 * @returns {RequestInit}
 */
const readAs = (backendToken) => ({
  method: 'GET',
  headers: {
    Authorization: `Bearer ${backendToken}`
  }
})

/**
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string,
 *   backendToken: string
 * }} params
 * @returns {Promise<AccreditationResource>}
 */
const fetchAccreditation = ({
  organisationId,
  registrationId,
  accreditationId,
  backendToken
}) =>
  /** @type {Promise<AccreditationResource>} */ (
    fetchJsonFromBackend(
      `/v1/organisations/${encodeURIComponent(organisationId)}/registrations/${encodeURIComponent(registrationId)}/accreditations/${encodeURIComponent(accreditationId)}`,
      readAs(backendToken)
    )
  )

/**
 * The reporting calendar the operator owes under this accreditation.
 *
 * `fetchReportingPeriods` raises rather than answering a failure, and the
 * catch belongs here rather than in it: the operator's own reports page shares
 * that helper, and a swallowed error there would silently empty their table.
 * A calendar this page could not read renders as no periods, so downstream has
 * one empty case to build and to test rather than two.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   backendToken: string,
 *   logger: TypedLogger
 * }} params
 * @returns {Promise<ReportingCalendar>}
 */
const fetchReportingCalendar = async ({
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
      message: `Failed to fetch reporting periods for organisation ${organisationId} registration ${registrationId}`,
      err: error
    })

    return { cadence: null, reportingPeriods: [] }
  }
}

/**
 * The ledger of the accreditation the address names, or null for a session
 * the backend granted no ledger scope: the backend would refuse the read, and
 * the page shows no ledger section to such a session anyway.
 *
 * The accreditation is not checked against the registration first. The
 * accreditation read alongside already refuses a pair the registration does
 * not hold, and a closed accreditation's own partition is legitimately this
 * page's content.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string,
 *   backendToken: string,
 *   canReadLedger: boolean
 * }} params
 * @returns {Promise<LedgerEvent[] | null>}
 */
const fetchLedger = ({
  canReadLedger,
  organisationId,
  registrationId,
  accreditationId,
  backendToken
}) =>
  canReadLedger
    ? fetchLedgerEvents({
        organisationId,
        registrationId,
        accreditationId,
        backendToken
      })
    : Promise.resolve(null)

/**
 * The page names the organisation, the registration and the accreditation
 * together in its caption, so all three are read. The registration comes off
 * the organisation document rather than its own address: the only thing the
 * caption wants from it is the number, which the stored record carries.
 *
 * The waste balance is a fourth read, from the address the operator's own
 * pages already use. `getWasteBalance` logs a failure and answers null rather
 * than raising, so a balance service that is down costs the page its two
 * balance rows rather than the whole page. The reporting calendar is a fifth,
 * degrading the same way. The ledger is a sixth, and it fails the page as the
 * accreditation read does: the ledger is the record a regulator opens this
 * page for, so a page without it would be missing its point.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string,
 *   backendToken: string,
 *   canReadLedger: boolean,
 *   logger: TypedLogger
 * }} params
 * @returns {Promise<AccreditationDetails>}
 */
export const fetchAccreditationDetails = async (params) => {
  const [linked, accreditation, wasteBalance, calendar, ledgerEvents] =
    await Promise.all([
      fetchRegistrationAndAccreditation(
        params.organisationId,
        params.registrationId,
        params.backendToken
      ),
      fetchAccreditation(params),
      getWasteBalance(
        params.organisationId,
        params.accreditationId,
        params.backendToken,
        params.logger
      ),
      fetchReportingCalendar(params),
      fetchLedger(params)
    ])

  return {
    organisation: linked.organisationData,
    registration: linked.registration,
    accreditation,
    wasteBalance,
    reportingPeriods: calendar.reportingPeriods,
    cadence: calendar.cadence,
    ledgerEvents
  }
}
