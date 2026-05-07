export const EMAIL_NOT_RECOGNISED_PATH = '/email-not-recognised'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
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
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */
