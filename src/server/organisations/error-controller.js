import { genericErrorViewModel } from '#server/error/generic-error.js'
import { homePath } from './home-page.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const errorController = {
  /**
   * @param {HapiRequest & { params: OrganisationYearParams }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    const { organisationNumber, year } = request.params
    const { t: localise } = request

    const homeUrl = request.localiseUrl(homePath(organisationNumber, { year }))

    return h.view('error/generic', genericErrorViewModel(localise, homeUrl))
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { OrganisationYearParams } from './index.js'
 */
