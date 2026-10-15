import { genericErrorViewModel } from '#server/error/generic-error.js'
import { organisationPath } from '#server/reports/helpers/report-paths.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const errorController = {
  /**
   * @param {HapiRequest & { params: OrganisationParams }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    const { organisationNumber } = request.params
    const { t: localise } = request

    const homeUrl = request.localiseUrl(
      organisationPath({ organisationNumber })
    )

    return h.view('error/generic', genericErrorViewModel(localise, homeUrl))
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { OrganisationParams } from './controller.js'
 */
