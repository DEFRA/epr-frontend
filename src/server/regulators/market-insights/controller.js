import Boom from '@hapi/boom'
import Joi from 'joi'

import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime, UK_TIME_ZONE } from '#server/common/helpers/format-time.js'
import { paths } from '#server/paths.js'

import { fetchWasteBalance } from './helpers/fetch-waste-balance.js'
import {
  adjacentMonths,
  describeMonth,
  describeReportingPeriod,
  isNavigable,
  lastCompleteMonth,
  reportingPeriod
} from './helpers/reporting-period.js'
import { toWasteBalanceTable } from './helpers/to-waste-balance-table.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { CalendarMonth } from './helpers/reporting-period.js'
 */

const MONTHS_IN_A_YEAR = 12

/**
 * @param {string} basePath
 * @param {CalendarMonth} calendarMonth
 */
const pageFor = (basePath, { year, month }) => `${basePath}/${year}/${month}`

/**
 * The page a regulator lands on from the link: the last complete month, so
 * the address always states which period the figures are for.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const latestPeriodController = {
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    return h.redirect(
      pageFor(
        request.localiseUrl(paths.regulators.marketInsights),
        lastCompleteMonth()
      )
    )
  }
}

/**
 * The market insights preview: the UK waste balance as the published tab lays
 * it out, one row per material and accreditation type with the reporting
 * months across as columns, for a reporting period the regulator chose.
 *
 * Every figure is served already summed. Grouping them into columns is
 * presentation, and the row total is the only arithmetic the page does.
 * @satisfies {Partial<HapiServerRoute<HapiRequest & { params: CalendarMonth }>>}
 */
export const controller = {
  options: {
    validate: {
      params: Joi.object({
        year: Joi.number().integer().required(),
        month: Joi.number().integer().min(1).max(MONTHS_IN_A_YEAR).required()
      })
    }
  },
  /**
   * @param {HapiRequest & { params: CalendarMonth }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { backendToken } = request.auth.credentials
    const { t: localise } = request
    const { year, month } = request.params

    if (!isNavigable({ year, month })) {
      throw Boom.notFound()
    }

    const period = reportingPeriod({ year, month })
    const { meta, data } = await fetchWasteBalance({
      year,
      month,
      backendToken
    })

    const basePath = request.localiseUrl(paths.regulators.marketInsights)
    /** @param {CalendarMonth} calendarMonth */
    const linkTo = (calendarMonth) => ({
      href: pageFor(basePath, calendarMonth),
      labelText: describeMonth(calendarMonth, localise)
    })
    const { previous, next } = adjacentMonths({ year, month })

    return h.view('regulators/market-insights/index', {
      pageTitle: localise('regulators:marketInsights:pageTitle'),
      heading: localise('regulators:marketInsights:heading'),
      caption: describeReportingPeriod(period, localise),
      description: localise('regulators:marketInsights:description'),
      // Stated beside the figures because the publication states it too, so a
      // regulator comparing the two can tell whether they were cut together.
      dataTakenAt: localise('regulators:marketInsights:dataTakenAt', {
        date: formatDate(meta.generatedAt, { timeZone: UK_TIME_ZONE }),
        time: formatTime(meta.generatedAt)
      }),
      wasteBalance: toWasteBalanceTable(data, period.months, localise),
      navigation: {
        ...(previous && { previous: linkTo(previous) }),
        ...(next && { next: linkTo(next) })
      }
    })
  }
}
