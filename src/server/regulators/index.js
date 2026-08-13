import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { SCOPES } from '#server/auth/scopes.js'
import { paths } from '#server/paths.js'
import Boom from '@hapi/boom'

/**
 * Regulators plugin
 * Registers the post-login landing page for Entra ID authenticated regulators,
 * and the page that a refused request lands on. A refusal reaches that page
 * from `catchAll`, which knows only that the backend answered 403, so the page
 * states no cause beyond the refusal itself. The sign-in refusal is a separate
 * page: it knows the identity holds no regulator role, and says so.
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

            return h.view('regulators/no-permission', {
              pageTitle: request.t('regulators:noPermission:pageTitle')
            })
          },
          method: 'GET',
          path: paths.regulators.noPermission
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
