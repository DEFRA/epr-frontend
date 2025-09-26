import { registrationController } from '~/src/server/registration/controller.js'

/**
 * Sets up the routes used in the registration page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const registration = {
  plugin: {
    name: 'registration',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}',
          ...registrationController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
