import { isDefraIdEnabled } from '#config/config.js'
import { controller as emailNotRecognisedController } from './email-not-recognised/controller.js'
import { controller as linkingGetController } from './linking/controller.js'
import { controller as linkingPostController } from './linking/post-controller.js'

/**
 * Sets up the routes used in the page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const account = {
  plugin: {
    name: 'account',
    register(server) {
      const authConfig = isDefraIdEnabled()
        ? { auth: { mode: 'try' } }
        : { auth: false }

      server.route([
        {
          ...emailNotRecognisedController,
          method: 'GET',
          path: '/email-not-recognised',
          options: authConfig
        },
        {
          ...linkingGetController,
          method: 'GET',
          path: '/account/linking',
          options: authConfig
        },
        {
          ...linkingPostController,
          method: 'POST',
          path: '/account/linking',
          options: authConfig
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
