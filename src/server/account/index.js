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
      const withAuthConfig = ({ options = {} }) => {
        const authConfig = isDefraIdEnabled()
          ? { auth: { mode: 'try' } }
          : { auth: false }
        return { ...authConfig, ...options }
      }

      server.route([
        {
          ...emailNotRecognisedController,
          method: 'GET',
          path: '/email-not-recognised',
          options: withAuthConfig(emailNotRecognisedController)
        },
        {
          ...linkingGetController,
          method: 'GET',
          path: '/account/linking',
          options: withAuthConfig(linkingGetController)
        },
        {
          ...linkingPostController,
          method: 'POST',
          path: '/account/linking',
          options: withAuthConfig(linkingPostController)
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
