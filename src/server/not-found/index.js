import Boom from '@hapi/boom'

/**
 * The route a request reaches when it matches no other.
 *
 * Without it hapi answers an unmatched path before it authenticates the
 * request, so the error page has no credentials to read and shows a regulator
 * the operator service name with no navigation at all. Matching here makes a
 * miss an ordinary authenticated request, and the error page then resolves its
 * chrome the way every other page does.
 *
 * The mode is `try` rather than `required`, so a path that does not exist
 * still answers a stranger with a 404 instead of sending them to sign in.
 *
 * It takes GET alone. Chrome is only ever read off a page a user browses to,
 * and a catch-all that also took POST would put CSRF checking in front of an
 * address that does not exist, which answers 403 where 404 is the truth.
 */
export const notFound = {
  plugin: {
    name: 'not-found',
    register(server) {
      server.route({
        method: 'GET',
        path: '/{any*}',
        options: { auth: { mode: 'try' } },
        handler: () => Boom.notFound()
      })
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
