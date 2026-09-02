import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { fetchReportingPeriods } from '#server/reports/helpers/fetch-reporting-periods.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
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
 *   cadence: CadenceValue | null
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
 * The page names the organisation, the registration and the accreditation
 * together in its caption, so all three are read. The registration comes off
 * the organisation document rather than its own address: the only thing the
 * caption wants from it is the number, which the stored record carries.
 *
 * The waste balance is a fourth read, from the address the operator's own
 * pages already use. `getWasteBalance` logs a failure and answers null rather
 * than raising, so a balance service that is down costs the page its two
 * balance rows rather than the whole page. The reporting calendar is a fifth,
 * degrading the same way.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string,
 *   backendToken: string,
 *   logger: TypedLogger
 * }} params
 * @returns {Promise<AccreditationDetails>}
 */
export const fetchAccreditationDetails = async (params) => {
  const [linked, accreditation, wasteBalance, calendar] = await Promise.all([
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
    fetchReportingCalendar(params)
  ])

  return {
    organisation: linked.organisationData,
    registration: linked.registration,
    accreditation,
    wasteBalance,
    reportingPeriods: calendar.reportingPeriods,
    cadence: calendar.cadence
  }
}
