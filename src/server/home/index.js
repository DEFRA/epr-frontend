import { homeController } from '~/src/server/home/controller.js'
import Joi from 'joi'

/**
 * Sets up the routes used in the home page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const home = {
  plugin: {
    name: 'home',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/{lang?}',
          options: {
            validate: {
              params: Joi.object({
                lang: Joi.string().valid('en', 'cy')
              })
            }
          },
          ...homeController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
