import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
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

    const { registration } = await getRequiredRegistrationWithAccreditation(
      organisationId,
      registrationId,
      session.idToken,
      request.logger,
      accreditationId
    )

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
