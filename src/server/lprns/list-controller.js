import Boom from '@hapi/boom'
import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { fetchPackagingRecyclingNotes } from './helpers/fetch-packaging-recycling-notes.js'
import { getRecipientDisplayName } from './helpers/stub-recipients.js'
import { buildListViewData } from './list-view-data.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const listController = {
  async handler(request, h) {
    if (!config.get('featureFlags.lprns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId } = request.params
    const session = request.auth.credentials

    const { registration, accreditation } =
      await fetchRegistrationAndAccreditation(
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

    const prns = await fetchPackagingRecyclingNotes(
      organisationId,
      registrationId,
      accreditationId,
      session.idToken
    )

    const hasCreatedPrns = prns.some((prn) => prn.status !== 'draft')

    const hasIssuedPrns = prns.some(
      (prn) => prn.status === 'awaiting_acceptance' || prn.status === 'issued'
    )

    const prnsAwaitingAuthorisation = prns
      .filter((prn) => prn.status === 'awaiting_authorisation')
      .map((prn) => ({
        id: prn.id,
        recipient: getRecipientDisplayName(prn.issuedToOrganisation),
        createdAt: prn.createdAt,
        tonnage: prn.tonnage,
        status: prn.status
      }))

    const issuedPrns = prns
      .filter(
        (prn) => prn.status === 'awaiting_acceptance' || prn.status === 'issued'
      )
      .map((prn) => ({
        id: prn.id,
        prnNumber: prn.prnNumber,
        recipient: getRecipientDisplayName(prn.issuedToOrganisation),
        issuedAt: prn.issuedAt,
        status: prn.status
      }))

    const viewData = buildListViewData(request, {
      organisationId,
      registrationId,
      accreditationId,
      registration,
      prns: prnsAwaitingAuthorisation,
      issuedPrns,
      hasCreatedPrns,
      wasteBalance,
      hasIssuedPrns
    })

    return h.view('lprns/list', viewData)
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
