import { SCOPES } from '#server/auth/scopes.js'
import { paths } from '#server/paths.js'

/**
 * Regulators plugin
 * Registers the post-login landing page for Entra ID authenticated regulators.
 * The page a refused request lands on has no route of its own: `catchAll`
 * renders it in place with the refusal's own 403, so the status line tells the
 * truth about the request that was refused.
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
