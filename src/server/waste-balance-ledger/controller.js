import { isRegulator } from '#server/auth/roles.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { loggingEventActions } from '#server/common/enums/event.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import Boom from '@hapi/boom'

import { buildLedgerRows } from './helpers/build-ledger-rows.js'
import { fetchWasteBalanceEvents } from './helpers/fetch-waste-balance-events.js'

/**
 * @typedef {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId?: string
 * }} WasteBalanceLedgerParams
 */

/**
 * One waste balance ledger, read as business events.
 *
 * The page is for a regulator, so it is gated on the role rather than on a
 * scope: an operator holds the same `organisation.read` for its own
 * organisation and still must not see this page.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const controller = {
  /**
   * @param {HapiRequest & { params: WasteBalanceLedgerParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const session = request.auth.credentials

    if (!isRegulator(session)) {
      throw Boom.forbidden('Waste balance ledger is for a regulator')
    }

    const { organisationId, registrationId, accreditationId } = request.params

    const { registration, rawAccreditation } =
      await fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        session.backendToken
      )

    const accreditation = accreditationId
      ? requireCurrentAccreditation({
          accreditationId,
          registration,
          rawAccreditation
        })
      : undefined

    const events = await fetchWasteBalanceEvents({
      organisationId,
      registrationId,
      accreditationId,
      backendToken: session.backendToken
    })

    const { t: localise } = request
    const { noteType } = getNoteTypeDisplayNames(registration)

    return h.view('waste-balance-ledger/index', {
      backUrl: request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}`
      ),
      caption: accreditation
        ? localise('waste-balance-ledger:accreditationCaption', {
            accreditationNumber: accreditation.accreditationNumber
          })
        : localise('waste-balance-ledger:registeredOnlyCaption'),
      heading: localise('waste-balance-ledger:heading'),
      pageTitle: localise('waste-balance-ledger:pageTitle'),
      rows: buildLedgerRows({ events, localise, noteType })
    })
  }
}

/**
 * The accreditation the address names, whatever its status. A closed
 * accreditation keeps its ledger, so the page must still name it.
 *
 * Only the ledger the registration writes to now is reachable from the
 * registration page, so an address pairing a registration with any other
 * accreditation names no ledger at all. Refusing it matters more than it
 * looks: the backend answers that pair with an empty array, so rendering it
 * would tell a regulator that nothing has moved a balance that does not exist.
 * @param {{
 *   accreditationId: string,
 *   registration: Registration,
 *   rawAccreditation: Accreditation | undefined
 * }} params
 * @returns {Accreditation}
 */
function requireCurrentAccreditation({
  accreditationId,
  registration,
  rawAccreditation
}) {
  if (registration.accreditationId !== accreditationId) {
    throw notFound(
      'Accreditation ID mismatch',
      errorCodes.accreditationIdMismatch,
      {
        event: {
          action: loggingEventActions.checkAccreditation,
          reason: `registrationId=${registration.id} accreditationId=${accreditationId}`
        }
      }
    )
  }

  if (!rawAccreditation) {
    throw notFound(
      'Accreditation not found',
      errorCodes.accreditationNotFound,
      {
        event: {
          action: loggingEventActions.checkAccreditation,
          reason: `registrationId=${registration.id} accreditationId=${accreditationId}`
        }
      }
    )
  }

  return rawAccreditation
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */
