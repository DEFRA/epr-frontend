import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { fetchPackagingRecyclingNotes } from './helpers/fetch-packaging-recycling-notes.js'
import { toNoteRows } from './helpers/note-rows.js'
import { buildListViewData } from './list-view-data.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const listController = {
  /**
   * @param {HapiRequest & { params: PrnListParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, registrationId, accreditationId } = request.params
    const session = request.auth.credentials

    const { registration } = await getRequiredRegistrationWithAccreditation({
      organisationId,
      registrationId,
      backendToken: session.backendToken,
      accreditationId
    })

    const [wasteBalance, prns] = await Promise.all([
      registration.accreditationId
        ? getWasteBalance(
            organisationId,
            registration.accreditationId,
            session.backendToken,
            request.logger
          )
        : null,
      fetchPackagingRecyclingNotes(
        organisationId,
        registrationId,
        accreditationId,
        session.backendToken
      )
    ])

    const viewData = buildListViewData(request, {
      organisationId,
      registrationId,
      accreditationId,
      registration,
      ...toNoteRows(prns),
      wasteBalance
    })

    return h.view('prns/list', viewData)
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PrnListParams } from './helpers/session-types.js'
 */
