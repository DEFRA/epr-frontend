import { findRecordIds } from '#server/common/helpers/natural-keys/find-record-ids.js'
import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { fetchRegistration } from '#server/common/helpers/organisations/fetch-registration.js'
import { accreditationIn } from '#server/common/helpers/organisations/registration-in-view.js'
import { fetchAccreditationBalance } from '#server/common/helpers/waste-balance/fetch-accreditation-balance.js'
import { fetchAccreditationLedgerEvents } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
import { year as toYear } from '#server/common/helpers/year.js'
import { fetchPackagingRecyclingNotes } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'
import { fetchReportingPeriodsByNumber } from '#server/reports/helpers/fetch-reporting-periods.js'

/**
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { AccreditationView, OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { PackagingRecyclingNote } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { AccreditationKeys, RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @typedef {{
 *   cadence: CadenceValue | null,
 *   reportingPeriods: ReportingPeriod[]
 * }} ReportingCalendar
 */

/**
 * @typedef {{
 *   organisation: OrganisationView,
 *   registration: RegistrationView,
 *   accreditation: AccreditationView,
 *   wasteBalance: WasteBalance | null,
 *   reportingPeriods: ReportingPeriod[],
 *   cadence: CadenceValue | null,
 *   ledgerEvents: LedgerEvent[] | null,
 *   packagingRecyclingNotes: PackagingRecyclingNote[]
 * }} AccreditationDetails
 */

/**
 * @typedef {AccreditationKeys & {
 *   credentials: UserSession,
 *   canReadLedger: boolean,
 *   logger: TypedLogger
 * }} AccreditationDetailsRequest
 */

/**
 * The accreditation from the organisation read model, with its balance.
 * @param {{ keys: AccreditationKeys, backendToken: string, logger: TypedLogger }} params
 * @returns {Promise<Pick<AccreditationDetails, 'organisation' | 'registration' | 'accreditation' | 'wasteBalance'>>}
 */
const fetchAccreditation = async ({ keys, backendToken, logger }) => {
  const { organisation, registration } = await fetchRegistration({
    ...keys,
    backendToken
  })
  const accreditation = accreditationIn(registration, keys.year)

  const wasteBalance = await fetchAccreditationBalance({
    organisationNumber: organisationNumber(Number(keys.organisationNumber)),
    year: toYear(Number(keys.year)),
    accreditationNumber: accreditation.accreditationNumber,
    backendToken,
    logger
  })

  return { organisation, registration, accreditation, wasteBalance }
}

/**
 * The reporting calendar, or no periods where it could not be read.
 * @param {{ keys: RegistrationKeys, backendToken: string, logger: TypedLogger }} params
 * @returns {Promise<ReportingCalendar>}
 */
const fetchReportingCalendar = async ({ keys, backendToken, logger }) => {
  try {
    return await fetchReportingPeriodsByNumber(keys, backendToken)
  } catch (error) {
    logger.error({
      message: `Failed to fetch reporting periods for organisation ${keys.organisationNumber} registration ${keys.registrationNumber}`,
      err: error
    })

    return { cadence: null, reportingPeriods: [] }
  }
}

/**
 * The accreditation's ledger, or null for a session the backend would refuse.
 * @param {{ keys: AccreditationKeys, backendToken: string, canReadLedger: boolean }} params
 * @returns {Promise<LedgerEvent[] | null>}
 */
const fetchLedger = ({ keys, backendToken, canReadLedger }) =>
  canReadLedger
    ? fetchAccreditationLedgerEvents(keys, backendToken)
    : Promise.resolve(null)

/**
 * The accreditation's notes, or none where they could not be read. A failed id
 * lookup fails the page.
 * @param {{ keys: AccreditationKeys, credentials: UserSession, logger: TypedLogger }} params
 * @returns {Promise<PackagingRecyclingNote[]>}
 */
const fetchNotes = async ({ keys, credentials, logger }) => {
  const { organisationId, registrationId, accreditationId } =
    await findRecordIds(keys, credentials)

  try {
    return await fetchPackagingRecyclingNotes(
      organisationId,
      registrationId,
      accreditationId,
      credentials.backendToken
    )
  } catch (error) {
    logger.error({
      message: `Failed to fetch packaging recycling notes for organisation ${organisationId} accreditation ${accreditationId}`,
      err: error
    })

    return []
  }
}

/**
 * Everything the regulator's accreditation page shows. A failed balance,
 * calendar or notes read degrades its section; any other failure fails the page.
 * @param {AccreditationDetailsRequest} params
 * @returns {Promise<AccreditationDetails>}
 */
export const fetchAccreditationDetails = async ({
  credentials,
  canReadLedger,
  logger,
  ...keys
}) => {
  const { backendToken } = credentials

  const [accreditation, calendar, ledgerEvents, packagingRecyclingNotes] =
    await Promise.all([
      fetchAccreditation({ keys, backendToken, logger }),
      fetchReportingCalendar({
        keys: {
          organisationNumber: keys.organisationNumber,
          registrationNumber: keys.registrationNumber
        },
        backendToken,
        logger
      }),
      fetchLedger({ keys, backendToken, canReadLedger }),
      fetchNotes({ keys, credentials, logger })
    ])

  return {
    ...accreditation,
    reportingPeriods: calendar.reportingPeriods,
    cadence: calendar.cadence,
    ledgerEvents,
    packagingRecyclingNotes
  }
}
