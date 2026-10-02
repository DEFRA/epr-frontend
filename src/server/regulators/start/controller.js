import { paths } from '#server/paths.js'

import { regulatorServiceHeader } from '../service-header.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * The address a regulator keeps a link to. Every other regulator page either
 * starts an Entra ID round trip or needs a session, so this is the only one
 * that answers the same way whether or not the browser still holds one.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
const controller = {
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    return h.view('regulators/start/index', {
      pageTitle: request.t('regulators:start:pageTitle'),
      ...regulatorServiceHeader(request, paths.regulators.start),
      startNowHref: request.localiseUrl(paths.auth.entraId.login)
    })
  }
}

export { controller }
