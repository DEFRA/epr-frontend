import Boom from '@hapi/boom'

import { buildYearChoices } from '#server/common/helpers/year-choices.js'
import { paths } from '#server/paths.js'

import { offeredYears } from './helpers/offered-years.js'
import { yearPath } from './helpers/year-path.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { ResponseToolkit } from '@hapi/hapi'
 */

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const chooseYearController = {
  /**
   * @param {HapiRequest & { params: { year: Year }, query: { year?: string, continue?: string } }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    const { t: localise } = request
    const { year: chosen, continue: pressedContinue } = request.query
    const addressYear = request.params.year
    const years = offeredYears()

    if (!years.includes(addressYear)) {
      throw Boom.notFound()
    }

    /** @param {Year} year */
    const landingFor = (year) =>
      request.localiseUrl(yearPath(paths.regulators.marketInsightsYear, year))

    const chosenYear = years.find((year) => String(year) === chosen)

    if (chosenYear) {
      return h.redirect(landingFor(chosenYear))
    }

    return h.view('common/templates/choose-year', {
      pageTitle: localise('regulators:marketInsights:chooseYear:heading'),
      heading: localise('regulators:marketInsights:chooseYear:heading'),
      hint: localise('regulators:marketInsights:chooseYear:hint'),
      continueText: localise('regulators:marketInsights:chooseYear:continue'),
      errorSummaryTitle: localise(
        'regulators:marketInsights:chooseYear:errorSummaryTitle'
      ),
      errorText: localise('regulators:marketInsights:chooseYear:error'),
      backUrl: landingFor(addressYear),
      items: buildYearChoices(years).map((item) => ({
        ...item,
        checked: item.value === String(addressYear)
      })),
      // An unchecked radio sends no `year`, so only Continue's `continue` shows a submission
      error: pressedContinue !== undefined
    })
  }
}
