import { prnStatuses } from '#server/common/constants/statuses.js'
import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { getPrns } from '#server/common/helpers/prns/get-prns.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { buildListViewData } from './view-data.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const listController = {
  async handler(request, h) {
    const { organisationId, registrationId } = request.params
    const session = request.auth.credentials

    const { registration, accreditation } =
      await getRequiredRegistrationWithAccreditation(
        organisationId,
        registrationId,
        session.idToken,
        request.logger
      )

    const [wasteBalance, prns] = await Promise.all([
      getWasteBalance(
        organisationId,
        accreditation.id,
        session.idToken,
        request.logger
      ),
      getPrns(organisationId, accreditation.id, session.idToken, request.logger)
    ])

    const hasCreatedPrns = prns.some(
      (prn) => prn.status !== prnStatuses.draft
    )

    const viewData = buildListViewData(request, {
      organisationId,
      registrationId,
      registration,
      wasteBalance,
      prns,
      hasCreatedPrns
    })

    return h.view('prns/view/list/list', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
