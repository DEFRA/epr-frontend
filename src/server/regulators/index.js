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
          path: '/regulators/home'
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
