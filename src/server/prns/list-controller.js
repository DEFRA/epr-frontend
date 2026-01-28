import Boom from '@hapi/boom'
import { getRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-registration-with-accreditation.js'
import { getPrns } from '#server/common/helpers/prns/get-prns.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { buildListViewData } from './list-view-data.js'

// Stub data for development until PRN creation is implemented
const STUB_PRNS = [
  {
    id: 'prn-001',
    prnNumber: 'PRN-2026-00001',
    issuedToOrganisation: { name: 'ComplyPak Ltd' },
    tonnageValue: 9,
    createdAt: '2026-01-21T10:30:00Z',
    status: 'awaiting_authorisation'
  },
  {
    id: 'prn-002',
    prnNumber: 'PRN-2026-00002',
    issuedToOrganisation: { name: 'Nestle (SEPA)', tradingName: 'Nestle UK' },
    tonnageValue: 4,
    createdAt: '2026-01-19T14:00:00Z',
    status: 'awaiting_authorisation'
  }
]

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

    // Remove fallback once waste balance API returns data
    const wasteBalance = (await getWasteBalance(
      organisationId,
      accreditation.id,
      session.idToken,
      request.logger
    )) ?? { amount: 20.5, availableAmount: 10.3 }

    // Remove fallback once PRN creation is implemented
    const apiPrns = await getPrns(
      organisationId,
      accreditation.id,
      session.idToken,
      request.logger
    )
    const prns = apiPrns.length > 0 ? apiPrns : STUB_PRNS

    const viewData = buildListViewData(request, {
      registration,
      prns,
      wasteBalance
    })

    return h.view('prns/list', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
