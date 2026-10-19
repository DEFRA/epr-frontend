import { fetchRequiredAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { showsDecemberBalance } from '#server/common/helpers/waste-balance/december-balance.js'
import { fetchPackagingRecyclingNotes } from './helpers/fetch-packaging-recycling-notes.js'
import { toAccreditationKeys } from './helpers/fetch-prn-context.js'
import { fetchPrnWasteBalance } from './helpers/fetch-prn-waste-balance.js'
import { toNoteRows } from './helpers/note-rows.js'
import { buildListViewData } from './list-view-data.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const listController = {
  /**
   * @param {HapiRequest & { params: PrnListParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const keys = toAccreditationKeys(request.params)
    const { backendToken } = request.auth.credentials

    const { registration, accreditation } = await fetchRequiredAccreditation(
      keys,
      backendToken
    )

    const [wasteBalance, prns, showsDecember] = await Promise.all([
      fetchPrnWasteBalance({
        keys,
        accreditationNumber: accreditation.accreditationNumber,
        backendToken,
        logger: request.logger
      }),
      fetchPackagingRecyclingNotes(keys, backendToken),
      showsDecemberBalance({ keys, backendToken, logger: request.logger })
    ])

    const viewData = buildListViewData(request, {
      keys,
      registration,
      ...toNoteRows(prns),
      wasteBalance,
      showsDecember
    })

    return h.view('prns/list', viewData)
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PrnListParams } from './helpers/session-types.js'
 */
