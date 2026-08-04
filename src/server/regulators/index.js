import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { SCOPES } from '#server/auth/scopes.js'
import { paths } from '#server/paths.js'
import Boom from '@hapi/boom'

/**
 * Regulators plugin
 * Registers the post-login landing page for Entra ID authenticated regulators
 */
export const regulators = {
  plugin: {
    name: 'regulators',
    register(server) {
      server.route([
        {
          /**
           * @param {HapiRequest} request
           * @param {ResponseToolkit} h
           */
          handler(request, h) {
            const { profile } = request.auth.credentials
            const username = profile.email?.split('@')[0]

            return h.view('regulators/home', {
              pageTitle: request.t('regulators:home:pageTitle'),
              username
            })
          },
          method: 'GET',
          path: paths.regulators.home,
          options: {
            auth: { scope: [SCOPES.regulator] }
          }
        },
        {
          /**
           * @param {HapiRequest} request
           * @param {ResponseToolkit} h
           */
          handler(request, h) {
            const session = request.auth.credentials

            if (session.provider !== OIDC_ENTRA_ID) {
              throw Boom.forbidden(
                'Access denied: not authenticated with Entra ID'
              )
            }

            return h.view('regulators/not-authorised', {
              pageTitle: request.t('regulators:notAuthorised:pageTitle')
            })
          },
          method: 'GET',
          path: paths.regulators.notAuthorised
        }
      ])
    }
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */
