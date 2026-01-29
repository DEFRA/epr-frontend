import Boom from '@hapi/boom'
import { getRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-registration-with-accreditation.js'
import { getPrns } from '#server/common/helpers/prns/get-prns.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { buildListViewData } from './list-view-data.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const listController = {
  async handler(request, h) {
    const { organisationId, registrationId } = request.params
    const session = request.auth.credentials

    const { registration, accreditation } =
      await getRegistrationWithAccreditation(
        organisationId,
        registrationId,
        session.idToken
      )

    if (!registration) {
      request.logger.warn({ registrationId }, 'Registration not found')
      throw Boom.notFound('Registration not found')
    }

    if (!accreditation) {
      request.logger.warn(
        { registrationId },
        'Not accredited for this registration'
      )
      throw Boom.notFound('Not accredited for this registration')
    }

    const [wasteBalance, prns] = await Promise.all([
      getWasteBalance(
        organisationId,
        accreditation.id,
        session.idToken,
        request.logger
      ),
      getPrns(organisationId, accreditation.id, session.idToken, request.logger)
    ])

    const viewData = buildListViewData(request, {
      registration,
      wasteBalance,
      prns
    })

    return h.view('prns/list', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
