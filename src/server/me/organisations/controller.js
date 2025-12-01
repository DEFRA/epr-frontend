import { statusCodes } from '#server/common/constants/status-codes.js'

/** @import { ServerRoute } from '@hapi/hapi' */

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  handler(request, h) {
    const { auth } = request

    // FIXME remove this console log when we're using auth / remove this endpoint
    // eslint-disable-next-line no-console
    console.log('auth :>> ', auth)

    // FIXME get this data from the backend when available
    const organisations = { organisations: { linked: {}, unlinked: {} } }

    return h.response(organisations).code(statusCodes.ok)
  }
}
