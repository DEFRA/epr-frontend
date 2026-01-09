import { healthController } from '#server/health/controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const health = {
  plugin: {
    name: 'health',
    register(server) {
      server.route({
        ...healthController,
        method: 'GET',
        path: '/health',
        options: {
          auth: false
        }
      })
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
