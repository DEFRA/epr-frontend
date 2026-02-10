import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayName } from '#server/common/helpers/waste-organisations/get-display-name.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { fetchPackagingRecyclingNotes } from './helpers/fetch-packaging-recycling-notes.js'
import { buildListViewData } from './list-view-data.js'

const getPrnsAwaitingAuthorisation = (prns) =>
  prns
    .filter((prn) => prn.status === 'awaiting_authorisation')
    .map((prn) => ({
      id: prn.id,
      recipient: getDisplayName(prn.issuedToOrganisation),
      createdAt: prn.createdAt,
      tonnage: prn.tonnage,
      status: prn.status
    }))

const getIssuedPrns = (prns) =>
  prns
    .filter(
      (prn) => prn.status === 'awaiting_acceptance' || prn.status === 'issued'
    )
    .map((prn) => ({
      id: prn.id,
      prnNumber: prn.prnNumber,
      recipient: getDisplayName(prn.issuedToOrganisation),
      issuedAt: prn.issuedAt,
      status: prn.status
    }))

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

    const [wasteBalance, prns] = await Promise.all([
      registration.accreditationId
        ? getWasteBalance(
            organisationId,
            registration.accreditationId,
            session.idToken,
            request.logger
          )
        : null,
      fetchPackagingRecyclingNotes(
        organisationId,
        registrationId,
        accreditationId,
        session.idToken
      )
    ])

    const hasCreatedPrns = prns.some((prn) => prn.status !== 'draft')

    const viewData = buildListViewData(request, {
      organisationId,
      registrationId,
      accreditationId,
      registration,
      prns: getPrnsAwaitingAuthorisation(prns),
      issuedPrns: getIssuedPrns(prns),
      hasCreatedPrns,
      wasteBalance
    })

    return h.view('lprns/list', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
