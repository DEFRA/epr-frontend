import { paths } from '#server/paths.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { ResponseToolkit } from '@hapi/hapi'
 */

/**
 * The market insights preview, which mirrors the monthly workbook a page at a
 * time. This page names the sets of figures and links to them; each one reads
 * only what it shows, so opening this page reads nothing.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const controller = {
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    const { t: localise } = request

    return h.view('regulators/market-insights/index', {
      pageTitle: localise('regulators:marketInsights:pageTitle'),
      heading: localise('regulators:marketInsights:heading'),
      description: localise('regulators:marketInsights:description'),
      figureSets: [
        {
          text: localise('regulators:marketInsights:wasteBalance:linkText'),
          href: request.localiseUrl(paths.regulators.marketInsightsWasteBalance)
        },
        {
          text: localise('regulators:marketInsights:figures:linkText'),
          href: request.localiseUrl(paths.regulators.marketInsightsUk)
        },
        {
          text: localise(
            'regulators:marketInsights:outstandingReturns:linkText'
          ),
          href: request.localiseUrl(
            paths.regulators.marketInsightsOutstandingReturns
          )
        }
      ]
    })
  }
}
