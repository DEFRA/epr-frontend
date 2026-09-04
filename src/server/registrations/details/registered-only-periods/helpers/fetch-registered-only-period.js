import { CADENCE } from '#server/reports/constants.js'
import { fetchReportingPeriods } from '#server/reports/helpers/fetch-reporting-periods.js'

import { fetchRegistrationDetails } from '../../helpers/fetch-registration-details.js'

/**
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { RegistrationDetails } from '../../helpers/fetch-registration-details.js'
 */

/**
 * @typedef {RegistrationDetails & { reportingPeriods: ReportingPeriod[] }} RegisteredOnlyPeriodDetails
 */

/**
 * The quarterly calendar for the year this page covers.
 *
 * A registered-only operator reports quarterly, so that is what is asked for
 * by name rather than left to the registration's current status: an operator
 * who has since been accredited reports monthly now, and the calendar left to
 * itself would answer for that instead of for the period being read.
 *
 * `fetchReportingPeriods` raises rather than answering a failure, and the catch
 * belongs here rather than in it: the operator's own reports page shares that
 * helper, and a swallowed error there would silently empty their table. A
 * calendar this page could not read renders as no periods, so downstream has
 * one empty case to build and to test rather than two.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   backendToken: string,
 *   year: number,
 *   logger: TypedLogger
 * }} params
 * @returns {Promise<ReportingPeriod[]>}
 */
const fetchQuarterlyCalendar = async ({
  organisationId,
  registrationId,
  backendToken,
  year,
  logger
}) => {
  try {
    const { reportingPeriods } = await fetchReportingPeriods(
      organisationId,
      registrationId,
      backendToken,
      { year, cadence: CADENCE.QUARTERLY }
    )

    return reportingPeriods
  } catch (error) {
    logger.error({
      message: `Failed to fetch the ${year} quarterly calendar for organisation ${organisationId} registration ${registrationId}`,
      err: error
    })

    return []
  }
}

/**
 * The organisation, registration and accreditations the page names, plus the
 * quarterly periods the year holds. Both reads go out together: the calendar
 * does not depend on what the registration says.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   backendToken: string,
 *   year: number,
 *   logger: TypedLogger
 * }} params
 * @returns {Promise<RegisteredOnlyPeriodDetails>}
 */
export const fetchRegisteredOnlyPeriod = async (params) => {
  const [details, reportingPeriods] = await Promise.all([
    fetchRegistrationDetails(params),
    fetchQuarterlyCalendar(params)
  ])

  return { ...details, reportingPeriods }
}
