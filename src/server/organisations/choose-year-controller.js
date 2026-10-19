import { config } from '#config/config.js'
import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { fetchOrganisationYears } from '#server/common/helpers/organisations/fetch-organisation-years.js'
import { year as toYear } from '#server/common/helpers/year.js'
import Boom from '@hapi/boom'
import { homePath } from './home-page.js'
import { buildYearChoices } from './year-choices.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { OrganisationParams } from './index.js'
 */

/**
 * @param {string} segment
 * @returns {Year}
 */
const yearOf = (segment) => {
  if (!/^\d{4}$/.test(segment)) {
    throw Boom.notFound()
  }

  return toYear(Number(segment))
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const chooseYearController = {
  /**
   * @param {HapiRequest & { params: OrganisationParams, query: { year?: string, continue?: string } }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    if (!config.get('featureFlags.navigateAcrossYears')) {
      throw Boom.notFound()
    }

    const { t: localise } = request
    const { year: chosen, continue: pressedContinue } = request.query
    const orgNumber = organisationNumber(
      Number(request.params.organisationNumber)
    )
    const addressYear = yearOf(String(request.params.year))
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
