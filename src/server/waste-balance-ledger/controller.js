import Boom from '@hapi/boom'

import { readsAsARegulator } from '#server/auth/reads-as-a-regulator.js'
import { readsWasteRecordsDownloads } from '#server/auth/waste-records-downloads.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditationByNumber } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getRequiredRegistrationWithAccreditationByNumber } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'

import { buildLedgerRows } from '#server/common/helpers/waste-balance-ledger/build-ledger-rows.js'
import {
  fetchAccreditationLedgerEvents,
  fetchRegisteredOnlyLedgerEvents
} from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
import {
  toAccreditationChildPage,
  toRegistrationTrail
} from '#server/registrations/details/helpers/accreditation-child-page.js'
import { organisationName } from '#server/registrations/details/helpers/caption.js'
import {
  accreditationPath,
  organisationPath,
  registrationPath
} from '#server/reports/helpers/report-paths.js'

/**
 * @typedef {RegistrationKeys & { year?: string }} WasteBalanceLedgerParams
 */

// Fixed until the registered-only ledger page is year-configured.
const REGISTERED_ONLY_LEDGER_YEAR = '2026'

/**
 * One waste balance ledger, read as business events.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const controller = {
  /**
   * @param {HapiRequest & { params: WasteBalanceLedgerParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const session = request.auth.credentials
    const { organisationNumber, registrationNumber, year } = request.params
    const registrationKeys = { organisationNumber, registrationNumber }

    const { organisationData, registration, accreditation, events } = year
      ? await readAccreditedLedger({ ...registrationKeys, year }, session)
      : await readRegisteredOnlyLedger(registrationKeys, request)

    const { t: localise } = request
    const { noteType } = getNoteTypeDisplayNames(registration)
    const heading = localise('waste-balance-ledger:heading')
    const name = organisationName(organisationData)
    const ledgerRegistrationPath = registrationPath(registrationKeys)
    const ledgerAccreditationPath = year
      ? accreditationPath({ ...registrationKeys, year })
      : undefined
    const recordPaths = {
      organisation: organisationPath(registrationKeys),
      registration: ledgerRegistrationPath
    }

    // The registered-only partition sits under no accreditation, so its trail
    // stops at the registration and its caption names the phase instead.
    const page = accreditation
      ? toAccreditationChildPage({
          heading,
          localise,
          localiseUrl: request.localiseUrl,
          organisationName: name,
          registrationNumber: registration.registrationNumber,
          accreditationNumber: accreditation.accreditationNumber,
          paths: {
            ...recordPaths,
            accreditation: /** @type {string} */ (ledgerAccreditationPath)
          }
        })
      : toRegisteredOnlyPage({
          heading,
          localise,
          localiseUrl: request.localiseUrl,
          name,
          paths: recordPaths
        })

    return h.view('waste-balance-ledger/index', {
      ...page,
      ledgerRows: buildLedgerRows({
        accreditationPath: ledgerAccreditationPath,
        events,
        localise,
        localiseUrl: request.localiseUrl,
        noteType,
        offersCsvDownloads: readsWasteRecordsDownloads(session),
        // An operator reaches this page too, and may not fetch the file.
        offersDownloads: readsAsARegulator(session),
        registrationPath: ledgerRegistrationPath
      })
    })
  }
}

/**
 * The year's accreditation and its ledger; 404 without a live one.
 * @param {AccreditationKeys} keys
 * @param {UserSession} session
 * @returns {Promise<LedgerRead>}
 */
async function readAccreditedLedger(keys, session) {
  const { organisationData, registration, accreditation } =
    await getRequiredRegistrationWithAccreditationByNumber(keys, session)
  const events = await fetchAccreditationLedgerEvents(
    keys,
    session.backendToken
  )

  return { organisationData, registration, accreditation, events }
}

/**
 * The registration and its registered-only ledger; a 404 ledger reads as empty.
 * @param {RegistrationKeys} keys
 * @param {HapiRequest} request
 * @returns {Promise<LedgerRead>}
 */
async function readRegisteredOnlyLedger(keys, request) {
  const session = request.auth.credentials
  const { organisationData, registration } =
    await fetchRegistrationAndAccreditationByNumber(
      keys.organisationNumber,
      keys.registrationNumber,
      session
    )

  try {
    const events = await fetchRegisteredOnlyLedgerEvents(
      { ...keys, year: REGISTERED_ONLY_LEDGER_YEAR },
      session.backendToken
    )

    return { organisationData, registration, events }
  } catch (error) {
    if (!Boom.isBoom(error, statusCodes.notFound)) {
      throw error
    }

    request.logger.info({
      message: 'No registered-only ledger for the year, showing it empty',
      event: {
        action: 'fetch_registered_only_ledger',
        reason: `organisationNumber=${keys.organisationNumber} registrationNumber=${keys.registrationNumber} year=${REGISTERED_ONLY_LEDGER_YEAR}`
      }
    })

    return { organisationData, registration, events: [] }
  }
}

/**
 * @param {{
 *   heading: string,
 *   localise: HapiRequest['t'],
 *   localiseUrl: HapiRequest['localiseUrl'],
 *   name: string,
 *   paths: { organisation: string, registration: string }
 * }} params
 */
function toRegisteredOnlyPage({ heading, localise, localiseUrl, name, paths }) {
  return {
    breadcrumbs: [
      ...toRegistrationTrail({
        localise,
        localiseUrl,
        organisationName: name,
        paths
      }),
      { text: heading }
    ],
    caption: localise('waste-balance-ledger:registeredOnlyCaption'),
    heading,
    pageTitle: localise('waste-balance-ledger:pageTitle')
  }
}

/**
 * @typedef {{
 *   organisationData: Organisation,
 *   registration: Registration,
 *   accreditation?: AccreditationApproved,
 *   events: LedgerEvent[]
 * }} LedgerRead
 */

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { AccreditationApproved } from '#domain/organisations/accreditation.js'
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { AccreditationKeys, RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 */
