import { readsAsARegulator } from '#server/auth/reads-as-a-regulator.js'
import { readsWasteRecordsDownloads } from '#server/auth/waste-records-downloads.js'
import { fetchRequiredAnyAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'

import { buildLedgerRows } from '#server/common/helpers/waste-balance-ledger/build-ledger-rows.js'
import { fetchAccreditationLedgerEvents } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
import { toAccreditationChildPage } from '#server/registrations/details/helpers/accreditation-child-page.js'
import {
  accreditationPath,
  organisationPath,
  registrationPath
} from '#server/reports/helpers/report-paths.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * One accreditation's waste balance ledger, read as business events.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const controller = {
  /**
   * @param {HapiRequest & { params: AccreditationKeys }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const session = request.auth.credentials
    const { organisationNumber, registrationNumber, year } = request.params
    const registrationKeys = { organisationNumber, registrationNumber }
    const keys = { ...registrationKeys, year }

    const { organisation, registration, accreditation } =
      await fetchRequiredAnyAccreditation(keys, session.backendToken)
    const events = await fetchAccreditationLedgerEvents(
      keys,
      session.backendToken
    )

    const { t: localise } = request
    const { noteType } = getNoteTypeDisplayNames(registration)
    const ledgerRegistrationPath = registrationPath(registrationKeys)
    const ledgerAccreditationPath = accreditationPath(keys)

    return h.view('waste-balance-ledger/index', {
      ...toAccreditationChildPage({
        heading: localise('waste-balance-ledger:heading'),
        localise,
        localiseUrl: request.localiseUrl,
        organisationName: organisation.displayName,
        registrationNumber,
        accreditationNumber: accreditation.accreditationNumber,
        paths: {
          organisation: organisationPath(registrationKeys),
          registration: ledgerRegistrationPath,
          accreditation: ledgerAccreditationPath
        }
      }),
      ledgerRows: buildLedgerRows({
        accreditationPath: ledgerAccreditationPath,
        events,
        localise,
        localiseUrl: request.localiseUrl,
        noteType,
        offersCsvDownloads: readsWasteRecordsDownloads(session),
        offersDownloads: readsAsARegulator(session),
        registrationPath: ledgerRegistrationPath
      })
    })
  }
}
