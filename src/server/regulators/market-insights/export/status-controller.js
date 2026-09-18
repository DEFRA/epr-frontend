import { paths } from '#server/paths.js'

import { fetchExportStatus } from '../helpers/fetch-export-status.js'
import { buildQuerySchema } from './build-query-schema.js'
import {
  buildMarketInsightsExportDownloadPath,
  buildMarketInsightsExportPath,
  forBuild
} from './paths.js'
import { marketInsightsExportStatuses } from './statuses.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { BuildQuery } from './build-query-schema.js'
 * @import { ExportPeriod } from './paths.js'
 */

const VIEW_NAME = 'regulators/market-insights/export/index'

/**
 * @typedef {(key: string, values?: Record<string, string | number>) => string} Localise
 */

/**
 * The addresses a view of this page might offer. Which ones matter depends on
 * the state, so each view reads only the ones it shows.
 * @typedef {{
 *   pollUrl: string,
 *   downloadUrl: string,
 *   retryUrl: string,
 *   failureReason?: string
 * }} ExportContext
 */

/**
 * What the page says while the zip is being built. This is the only state that
 * refreshes: every other one is where the regulator stops.
 * @param {Localise} localise
 * @param {ExportContext} context
 */
const stillBuilding = (localise, { pollUrl }) => ({
  heading: localise('regulators:marketInsights:export:building:heading'),
  message: localise('regulators:marketInsights:export:building:message'),
  shouldPoll: true,
  pollUrl
})

/**
 * @param {Localise} localise
 * @param {ExportContext} context
 */
const ready = (localise, { downloadUrl }) => ({
  heading: localise('regulators:marketInsights:export:ready:heading'),
  message: localise('regulators:marketInsights:export:ready:message'),
  shouldPoll: false,
  downloadUrl,
  downloadText: localise('regulators:marketInsights:export:ready:downloadText')
})

/**
 * Where the build will not arrive. A reason is shown where the backend gave
 * one. Asking again names no build, so the backend starts a new one rather
 * than answering about the one that failed.
 * @param {Localise} localise
 * @param {ExportContext} context
 */
const willNotArrive = (localise, { retryUrl, failureReason }) => ({
  heading: localise('regulators:marketInsights:export:failed:heading'),
  message: localise('regulators:marketInsights:export:failed:message'),
  shouldPoll: false,
  reason: failureReason,
  retryUrl,
  retryText: localise('regulators:marketInsights:export:failed:retryText')
})

/** @type {Record<string, (localise: Localise, context: ExportContext) => object>} */
const VIEW_FOR_STATUS = {
  [marketInsightsExportStatuses.building]: stillBuilding,
  [marketInsightsExportStatuses.ready]: ready,
  [marketInsightsExportStatuses.failed]: willNotArrive
}

/**
 * The page a regulator asks for the export on, and waits on while it is built.
 *
 * A finished export is never reused, so the bare address always starts a fresh
 * build and the backend names it. Every refresh and the download then carry
 * that name back, or each poll would start another build and never see one
 * finish. Where a build has been overtaken the backend answers with the one
 * that took over, and this page follows it by polling whatever it was last
 * told.
 *
 * The wait is a meta refresh rather than a script, so it works with JavaScript
 * turned off, and it is emitted only while a build is running - a terminal
 * state stops it, and so does a state this page does not recognise, which
 * would otherwise refresh for ever.
 * @satisfies {Partial<HapiServerRoute<HapiRequest & { query: BuildQuery }>>}
 */
export const marketInsightsExportStatusController = {
  options: {
    validate: {
      query: buildQuerySchema
    }
  },
  /**
   * @param {HapiRequest & { params: ExportPeriod, query: BuildQuery }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { year, cadence, period } = request.params
    const { build: buildToken } = request.query
    const { backendToken } = request.auth.credentials
    const { t: localise } = request

    const state = await fetchExportStatus({
      year,
      cadence,
      period,
      buildToken,
      backendToken
    })

    // The build the backend just named, or the one already being watched where
    // it named none - which is every state but a running build.
    const watching = state.buildToken ?? buildToken
    const pageUrl = buildMarketInsightsExportPath({ year, cadence, period })
    const downloadPath = buildMarketInsightsExportDownloadPath({
      year,
      cadence,
      period
    })

    const viewFor = VIEW_FOR_STATUS[state.status] ?? willNotArrive

    return h.view(VIEW_NAME, {
      pageTitle: localise('regulators:marketInsights:export:pageTitle'),
      breadcrumbs: [
        {
          text: localise('regulators:marketInsights:heading'),
          href: request.localiseUrl(paths.regulators.marketInsights)
        },
        { text: localise('regulators:marketInsights:export:heading') }
      ],
      ...viewFor(localise, {
        pollUrl: request.localiseUrl(forBuild(pageUrl, watching)),
        downloadUrl: request.localiseUrl(forBuild(downloadPath, watching)),
        retryUrl: request.localiseUrl(pageUrl),
        failureReason: state.failureReason
      })
    })
  }
}
