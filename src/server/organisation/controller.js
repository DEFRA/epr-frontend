import Boom from '@hapi/boom'
import { capitalize } from 'lodash-es'

import { config } from '#config/config.js'
import {
  fetchWithAuthHeader,
  fetchWithAuthInterception
} from '#server/common/helpers/auth/fetch.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const organisationLinkController = {
  async handler(request, h) {
    const { organisationId } = request.params
    const { redirectUrl } = request.query
    const baseUrl = config.get('eprBackendUrl')
    const url = `${baseUrl}/v1/organisations/${organisationId}/link`

    try {
      const { response } = await fetchWithAuthHeader(url, request)

      if (response.ok) {
        return h.redirect(redirectUrl ?? `/organisations/${organisationId}`)
      } else {
        throw Boom.unauthorized()
      }
    } catch (error) {
      request.logger.info('Failed to link organisation', error)

      throw Boom.unauthorized()
    }
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const organisationController = {
  async handler(request, h) {
    request.logger.info('organisationController')

    const { organisationId } = request.params
    const baseUrl = config.get('eprBackendUrl')
    const url = `${baseUrl}/v1/organisations/${organisationId}`

    try {
      const { data, view } = await fetchWithAuthInterception(url, request, h)

      if (view) {
        return view
      }

      const { companyDetails = {}, registrations = [] } = data ?? {}

      const { name } = companyDetails

      const templateData = {
        registrations: registrations.map(({ id, material, status }) => [
          {
            html: `<a href="/organisations/${organisationId}/registrations/${id}">${capitalize(material)}</a>`
          },
          {
            text: status
          }
        ])
      }

      return h.view('organisation/index', {
        pageTitle: name,
        heading: name,
        defraId: request.server.app.defraId,
        ...templateData
      })
    } catch (error) {
      request.logger.error(error, 'Failed to fetch organisation')

      throw Boom.unauthorized()
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
