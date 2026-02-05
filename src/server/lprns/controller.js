import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { mapToSelectOptions } from '#server/common/helpers/waste-organisations/map-to-select-options.js'
import Boom from '@hapi/boom'
import { buildCreatePrnViewData } from './view-data.js'

/**
 * Build error data for insufficient balance redirect
 * @param {(key: string) => string} localise
 * @returns {{errors: object, errorSummary: {title: string, list: Array}}}
 */
function buildInsufficientBalanceError(localise) {
  const message = localise('lprns:insufficientBalanceError')
  return {
    errors: {},
    errorSummary: {
      title: localise('lprns:errorSummaryTitle'),
      list: [{ text: message, href: '#tonnage' }]
    }
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  async handler(request, h) {
    if (!config.get('featureFlags.lprns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId } = request.params
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

    const { organisations } =
      await request.wasteOrganisationsService.getOrganisations()

    const viewData = buildCreatePrnViewData(request, {
      registration,
      recipients: mapToSelectOptions(organisations)
    })

    // Check for insufficient balance error from redirect
    const { t: localise } = request
    const errorParam = request.query.error

    if (errorParam === 'insufficient_balance') {
      const { errors, errorSummary } = buildInsufficientBalanceError(localise)
      return h.view('lprns/create', { ...viewData, errors, errorSummary })
    }

    return h.view('lprns/create', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
