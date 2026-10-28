import { config } from '#config/config.js'
import { fetchOrganisationYears } from '#server/common/helpers/organisations/fetch-organisation-years.js'
import Boom from '@hapi/boom'
import { homePath } from './home-page.js'
import { buildYearChoices } from './year-choices.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { OrganisationYearParams } from './index.js'
 */

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const chooseYearController = {
  /**
   * @param {HapiRequest & { params: OrganisationYearParams, query: { year?: string, continue?: string } }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    if (!config.get('featureFlags.navigateAcrossYears')) {
      throw Boom.notFound()
    }

    const { t: localise } = request
    const { year: chosen, continue: pressedContinue } = request.query
    const orgNumber = request.params.organisationNumber
    const addressYear = request.params.year
    const years = await fetchOrganisationYears(
      orgNumber,
      request.auth.credentials.backendToken
    )

    if (!years.includes(addressYear)) {
      throw Boom.notFound()
    }

    // An unchecked radio sends no `year`, so only the Continue button's `continue` shows a form was submitted
    const submitted = pressedContinue !== undefined
    const chosenYear = years.find((year) => String(year) === chosen)

    if (chosenYear) {
      return h.redirect(
        request.localiseUrl(homePath(orgNumber, { year: chosenYear }))
      )
    }

    // A valid year has redirected above, so a submission reaching here chose none
    return h.view('organisations/choose-year', {
      pageTitle: localise('organisations:chooseYear:heading'),
      backUrl: request.localiseUrl(homePath(orgNumber, { year: addressYear })),
      items: buildYearChoices(years),
      error: submitted
    })
  }
}
