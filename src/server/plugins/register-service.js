/** @import {Request, Server} from '@hapi/hapi' */

/**
 * Registers a service on the request object using lazy initialisation.
 * @param {Server} server - Hapi server instance
 * @param {string} name - Property name to register on request
 * @param {(request: Request) => unknown} getInstance - Factory function that returns the service instance
 */
export const registerService = (server, name, getInstance) => {
  server.ext('onRequest', (request, h) => {
    /** @type {unknown} */
    let cached

    Object.defineProperty(request, name, {
      get() {
        if (!cached) {
          cached = getInstance(request)
        }
        return cached
      },
      enumerable: true,
      configurable: true
    })

    return h.continue
  })
}
