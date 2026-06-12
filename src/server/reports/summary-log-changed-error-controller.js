import { periodParamsSchema } from './helpers/period-params-schema.js'
import { deleteReport } from './helpers/delete-report.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest & { params: PeriodParams }>>} */
export const summaryLogChangedErrorGetController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  /**
   * @param {HapiRequest & { params: PeriodParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
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

    if (request.yar.get('summaryLogChangedError') !== periodBase) {
      return h.redirect(reportsUrl)
    }

    request.yar.clear('summaryLogChangedError')

    return h.view('reports/summary-log-changed-error', {
      pageTitle: localise('reports:summaryLogChangedPageTitle'),
      heading: localise('reports:summaryLogChangedHeading'),
      bodyLine1: localise('reports:summaryLogChangedBodyLine1'),
      bodyLine2: localise('reports:summaryLogChangedBodyLine2'),
      returnToReportsUrl: reportsUrl
    })
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest & { params: PeriodParams }>>} */
export const summaryLogChangedErrorPostController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  /**
   * @param {HapiRequest & { params: PeriodParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const {
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber
    } = request.params
    const session = request.auth.credentials

    await deleteReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber,
      session.idToken
    )

    return h.redirect(
      request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}/reports`
      )
    )
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 */
