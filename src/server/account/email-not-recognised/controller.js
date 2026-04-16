export const EMAIL_NOT_RECOGNISED_PATH = '/email-not-recognised'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    return h.view('account/email-not-recognised/index', {
      pageTitle: request.t('account:emailNotRecognised:pageTitle')
    })
  }
}

/**
 * @import { ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */
