import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchWithAuthInterception } from '#server/common/helpers/auth/fetch.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const registrationController = {
  async handler(request, h) {
    const { organisationId, registrationId } = request.params
    const baseUrl = config.get('eprBackendUrl')
    const url = `${baseUrl}/v1/organisations/${organisationId}`

    try {
      const { data, view } = await fetchWithAuthInterception(url, request, h)

      if (view) {
        return view
      }

      const { accreditations = [], registrations = [] } = data ?? {}

      const registration = registrations.find(({ id }) => id === registrationId)
      const accreditation = accreditations.find(
        ({ id }) => id === registration.accreditationId
      )

      if (!registration) {
        throw Boom.unauthorized()
      }

      return h.view('registration/index', {
        pageTitle: 'Registration', // @todo use activity/site/material info
        organisationId,
        registrationId,
        registration,
        accreditation,
        defraId: request.server.app.defraId
      })
    } catch (error) {
      request.logger.info('Failed to fetch registration', error)

      throw Boom.unauthorized()
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
