import { genericErrorViewModel } from '#server/error/generic-error.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const errorController = {
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    const { organisationId } = request.params
    const { t: localise } = request

    const homeUrl = `/organisations/${organisationId}`

    return h.view('error/generic', genericErrorViewModel(localise, homeUrl))
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */
