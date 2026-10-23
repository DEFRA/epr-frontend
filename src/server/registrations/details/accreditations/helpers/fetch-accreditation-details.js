import { fetchRegistration } from '#server/common/helpers/organisations/fetch-registration.js'
import { accreditationIn } from '#server/common/helpers/organisations/registration-in-view.js'
import { fetchAccreditationBalance } from '#server/common/helpers/waste-balance/fetch-accreditation-balance.js'
import { fetchAccreditationLedgerEvents } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
import { toYear } from '#server/common/helpers/year.js'
import { fetchPackagingRecyclingNotes } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'
import { fetchYearCalendar } from '#server/reports/helpers/fetch-reporting-periods.js'

/**
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { BackendToken } from '#server/common/helpers/backend-token.js'
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { Accreditation, OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { PackagingRecyclingNote } from '#server/prns/helpers/prn-resource.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { AccreditationKeys, RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @typedef {{ reportingPeriods: ReportingPeriod[] }} ReportingCalendar
 */

/**
 * @typedef {{
 *   organisation: OrganisationView,
 *   registration: RegistrationView,
 *   accreditation: Accreditation,
 *   wasteBalance: WasteBalance | null,
 *   reportingPeriods: ReportingPeriod[],
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
 * @param {{ keys: AccreditationKeys, backendToken: BackendToken, logger: TypedLogger }} params
 * @returns {Promise<Pick<AccreditationDetails, 'organisation' | 'registration' | 'accreditation' | 'wasteBalance'>>}
 */
const fetchAccreditation = async ({ keys, backendToken, logger }) => {
  const { organisation, registration } = await fetchRegistration({
    ...keys,
    backendToken
  })
  const accreditation = accreditationIn(registration, keys.year)

  const wasteBalance = await fetchAccreditationBalance({
    organisationNumber: keys.organisationNumber,
    year: toYear(Number(keys.year)),
    accreditationNumber: accreditation.accreditationNumber,
    backendToken,
    logger
  })

  return { organisation, registration, accreditation, wasteBalance }
}

/**
 * The year's accredited periods, or no periods where they could not be read.
 * @param {{ keys: RegistrationKeys & { year: number }, backendToken: BackendToken, logger: TypedLogger }} params
 * @returns {Promise<ReportingCalendar>}
 */
const fetchReportingCalendar = async ({ keys, backendToken, logger }) => {
  try {
    const { accredited } = await fetchYearCalendar(keys, backendToken)
    return { reportingPeriods: accredited?.reportingPeriods ?? [] }
  } catch (error) {
    logger.error({
      message: `Failed to fetch reporting periods for organisation ${keys.organisationNumber} registration ${keys.registrationNumber}`,
      err: error
    })

    return { reportingPeriods: [] }
  }
}

/**
 * The accreditation's ledger, or null for a session the backend would refuse.
 * @param {{ keys: AccreditationKeys, backendToken: BackendToken, canReadLedger: boolean }} params
 * @returns {Promise<LedgerEvent[] | null>}
 */
const fetchLedger = ({ keys, backendToken, canReadLedger }) =>
  canReadLedger
    ? fetchAccreditationLedgerEvents(keys, backendToken)
    : Promise.resolve(null)

/**
 * The accreditation's notes, or none where they could not be read.
 * @param {{ keys: AccreditationKeys, backendToken: BackendToken, logger: TypedLogger }} params
 * @returns {Promise<PackagingRecyclingNote[]>}
 */
const fetchNotes = async ({ keys, backendToken, logger }) => {
  try {
    return await fetchPackagingRecyclingNotes(keys, backendToken)
  } catch (error) {
    logger.error({
      message: `Failed to fetch packaging recycling notes for organisation ${keys.organisationNumber} registration ${keys.registrationNumber} year ${keys.year}`,
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
          registrationNumber: keys.registrationNumber,
          year: Number(keys.year)
        },
        backendToken,
        logger
      }),
      fetchLedger({ keys, backendToken, canReadLedger }),
      fetchNotes({ keys, backendToken, logger })
    ])

  return {
    ...accreditation,
    reportingPeriods: calendar.reportingPeriods,
    ledgerEvents,
    packagingRecyclingNotes
  }
}
