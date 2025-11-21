import {
  organisationController,
  organisationLinkController
} from '#server/organisation/controller.js'

/**
 * Sets up the routes used in the registration page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const organisation = {
  plugin: {
    name: 'organisation',
    register(server) {
      server.route([
        {
          ...organisationLinkController,
          method: 'GET',
          path: '/organisations/{organisationId}/link',
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            }
          }
        },
        {
          ...organisationController,
          method: 'GET',
          path: '/organisations/{organisationId}',
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            }
          }
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
