import Boom from '@hapi/boom'
import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { buildCreatePrnViewData } from './view-data.js'

// Stub recipients until real API is available
const STUB_RECIPIENTS = [
  { value: 'producer-1', text: 'Acme Packaging Ltd' },
  { value: 'producer-2', text: 'BigCo Waste Solutions' },
  { value: 'producer-3', text: 'EcoRecycle Industries' },
  { value: 'scheme-1', text: 'Green Compliance Scheme' },
  { value: 'scheme-2', text: 'National Packaging Scheme' }
]

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

    const viewData = buildCreatePrnViewData(request, {
      registration,
      recipients: STUB_RECIPIENTS
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
