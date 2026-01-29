import Boom from '@hapi/boom'
import { config } from '#config/config.js'
import { getRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-registration-with-accreditation.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { buildListViewData } from './list-view-data.js'

// Stub PRNs until real API is available
const STUB_PRNS = [
  {
    id: 'prn-001',
    recipient: 'Acme Packaging Ltd',
    createdAt: '2026-01-15',
    tonnage: 50,
    status: 'awaiting_authorisation'
  },
  {
    id: 'prn-002',
    recipient: 'BigCo Waste Solutions',
    createdAt: '2026-01-18',
    tonnage: 120,
    status: 'awaiting_authorisation'
  },
  {
    id: 'prn-003',
    recipient: 'Green Compliance Scheme',
    createdAt: '2026-01-20',
    tonnage: 75,
    status: 'issued'
  }
]

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const listController = {
  async handler(request, h) {
    if (!config.get('featureFlags.prns')) {
      throw Boom.notFound()
    }

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

    const wasteBalance = await getWasteBalance(
      organisationId,
      registration.accreditationId,
      session.idToken,
      request.logger
    )

    // Filter to only show PRNs awaiting authorisation (PAE-948 requirement)
    const prnsAwaitingAuthorisation = STUB_PRNS.filter(
      (prn) => prn.status === 'awaiting_authorisation'
    )

    const viewData = buildListViewData(request, {
      organisationId,
      registrationId,
      registration,
      prns: prnsAwaitingAuthorisation,
      wasteBalance
    })

    return h.view('prns/list', viewData)
  }
}

async function getWasteBalance(
  organisationId,
  accreditationId,
  idToken,
  logger
) {
  if (!accreditationId) {
    return null
  }

  try {
    const wasteBalanceMap = await fetchWasteBalances(
      organisationId,
      [accreditationId],
      idToken
    )
    return wasteBalanceMap[accreditationId] ?? null
  } catch (error) {
    logger.error({ error }, 'Failed to fetch waste balance')
    return null
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
