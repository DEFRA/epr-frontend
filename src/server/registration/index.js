import { registrationController } from '#server/registration/controller.js'

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
          ...registrationController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}',
          options: {
            // auth: false // auth not required (disables default scheme for this route)
            // auth: 'strategy-name' // uses the named strategy in "required" mode
            auth: {
              strategy: 'session', // only allow access to this page if the 'session' auth strategy is satisfied (ie a session cookie exists with a session ID, and session data exists in the cache for that ID)
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
