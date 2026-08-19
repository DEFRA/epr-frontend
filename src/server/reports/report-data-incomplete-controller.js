import { periodParamsSchema } from './helpers/period-params-schema.js'
import { buildReportDataIncompleteView } from './helpers/report-data-incomplete.js'

/**
 * Renders the exporter validation-error screen (PAE-1420) when report creation
 * was blocked because summary log rows are missing mandatory data. The
 * create-controller stores the backend's issue payload in the session and
 * redirects here; this screen reads it, guards against direct access, then
 * clears it so a refresh returns the operator to their reports.
 * @satisfies {Partial<HapiServerRoute<HapiRequest & { params: PeriodParams }>>}
 */
export const reportDataIncompleteGetController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  /**
   * @param {HapiRequest & { params: PeriodParams }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    const { t: localise } = request
    const {
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber
    } = request.params

    const reportsUrl = request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/reports`
    )
    const periodBase = `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/submissions/${submissionNumber}`

    const context = /** @type {ReportDataIncompleteContext | undefined} */ (
      request.yar.get('reportDataIncompleteContext')
    )
    if (context?.periodPath !== periodBase) {
      return h.redirect(reportsUrl)
    }
    request.yar.clear('reportDataIncompleteContext')

    const uploadUrl = request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`
    )

    const { heading, countLine, worksheets, helpLine } =
      buildReportDataIncompleteView(context.payload, localise)

    return h.view('reports/report-data-incomplete', {
      pageTitle: localise('reports:reportDataIncompletePageTitle'),
      backUrl: reportsUrl,
      caption: localise('reports:reportDataIncompleteCaption'),
      heading,
      countLine,
      editLead: localise('reports:reportDataIncompleteEditLead'),
      chooseFileText: localise('reports:reportDataIncompleteChooseFileLink'),
      editTrail: localise('reports:reportDataIncompleteEditTrail'),
      worksheets,
      helpLine,
      returnToReportsUrl: reportsUrl,
      returnToReportsText: localise(
        'reports:reportDataIncompleteReturnToReports'
      ),
      uploadUrl,
      uploadText: localise('reports:reportDataIncompleteUploadNew')
    })
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 * @import { ReportDataIncompletePayload } from './helpers/report-data-incomplete.js'
 * @typedef {{ periodPath: string, payload: ReportDataIncompletePayload }} ReportDataIncompleteContext
 */
