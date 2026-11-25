import Boom from '@hapi/boom'

import { paths } from '#server/paths.js'

import { offeredYears } from './helpers/offered-years.js'
import { yearPath } from './helpers/year-path.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { Year } from '#server/common/helpers/year.js'
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
   * @param {HapiRequest & { params: { year: Year } }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    const { t: localise } = request
    const { year } = request.params
    const years = offeredYears()

    if (!years.includes(year)) {
      throw Boom.notFound()
    }

    /** @param {string} path */
    const hrefFor = (path) => request.localiseUrl(yearPath(path, year))

    const heading = localise('regulators:marketInsights:yearHeading', { year })

    return h.view('regulators/market-insights/index', {
      pageTitle: heading,
      heading,
      yearDataText: localise('regulators:marketInsights:yearData', { year }),
      ...(years.length > 1 && {
        chooseYearUrl: hrefFor(paths.regulators.marketInsightsChooseYear),
        chooseYearLinkText: localise('regulators:marketInsights:chooseYearLink')
      }),
      figureSets: [
        {
          text: localise('regulators:marketInsights:wasteBalance:linkText'),
          href: hrefFor(paths.regulators.marketInsightsWasteBalance)
        },
        {
          text: localise('regulators:marketInsights:figures:uk:linkText'),
          href: hrefFor(paths.regulators.marketInsightsUk)
        },
        {
          text: localise('regulators:marketInsights:figures:england:linkText'),
          href: hrefFor(paths.regulators.marketInsightsEngland)
        },
        {
          text: localise('regulators:marketInsights:figures:wales:linkText'),
          href: hrefFor(paths.regulators.marketInsightsWales)
        },
        {
          text: localise('regulators:marketInsights:figures:scotland:linkText'),
          href: hrefFor(paths.regulators.marketInsightsScotland)
        },
        {
          text: localise(
            'regulators:marketInsights:figures:northern-ireland:linkText'
          ),
          href: hrefFor(paths.regulators.marketInsightsNorthernIreland)
        },
        {
          text: localise(
            'regulators:marketInsights:outstandingReturns:linkText'
          ),
          href: hrefFor(paths.regulators.marketInsightsOutstandingReturns)
        }
      ],
      // The only ways to take the figures away. They sit here rather than on
      // the seven pages because each holds every one of them: the workbook in
      // the published format, the zip as every underlying CSV.
      workbookDescription: localise(
        'regulators:marketInsights:workbook:description'
      ),
      workbookText: localise('regulators:marketInsights:workbook:linkText'),
      workbookHref: hrefFor(paths.regulators.marketInsightsWorkbook),
      unredactedWorkbookText: localise(
        'regulators:marketInsights:workbook:unredactedLinkText'
      ),
      unredactedWorkbookHref: hrefFor(
        paths.regulators.marketInsightsUnredactedWorkbook
      ),
      exportDescription: localise(
        'regulators:marketInsights:export:description'
      ),
      exportText: localise('regulators:marketInsights:export:linkText'),
      exportHref: hrefFor(paths.regulators.marketInsightsExport)
    })
  }
}
