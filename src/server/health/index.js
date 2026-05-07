import { healthController } from '#server/health/controller.js'

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
