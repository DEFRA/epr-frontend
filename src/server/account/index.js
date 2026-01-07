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
      server.route([
        {
          ...emailNotRecognisedController,
          method: 'GET',
          path: '/email-not-recognised'
        },
        {
          ...linkingGetController,
          method: 'GET',
          path: '/account/linking'
        },
        {
          ...linkingPostController,
          method: 'POST',
          path: '/account/linking'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
