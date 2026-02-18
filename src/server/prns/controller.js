import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { mapToSelectOptions } from '#server/common/helpers/waste-organisations/map-to-select-options.js'
import { buildCreatePrnViewData } from './view-data.js'

/**
 * Build error data for insufficient balance redirect
 * @param {(key: string) => string} localise
 * @returns {{errors: object, errorSummary: {title: string, list: Array}}}
 */
function buildInsufficientBalanceError(localise) {
  const message = localise('prns:insufficientBalanceError')
  return {
    errors: {},
    errorSummary: {
      title: localise('prns:errorSummaryTitle'),
      list: [{ text: message, href: '#tonnage' }]
    }
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  async handler(request, h) {
    if (!config.get('featureFlags.prns')) {
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

    const [{ organisations }, wasteBalance] = await Promise.all([
      request.wasteOrganisationsService.getOrganisations(),
      getWasteBalance(
        organisationId,
        accreditationId,
        session.idToken,
        request.logger
      )
    ])

    const viewData = buildCreatePrnViewData(request, {
      organisationId,
      recipients: mapToSelectOptions(organisations),
      registration,
      registrationId,
      wasteBalance
    })

    // Check for insufficient balance error from redirect
    const { t: localise } = request
    const errorParam = request.query.error

    if (errorParam === 'insufficient_balance') {
      const { errors, errorSummary } = buildInsufficientBalanceError(localise)
      return h.view('prns/create', { ...viewData, errors, errorSummary })
    }

    return h.view('prns/create', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
