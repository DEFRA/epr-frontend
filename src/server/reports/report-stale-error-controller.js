import { periodParamsSchema } from './helpers/period-params-schema.js'
import { deleteReport } from './helpers/delete-report.js'
import { STALE_REASON } from './helpers/stale.js'

/**
 * Resolves the translation-key prefix for the given stale reasons. Both
 * reasons present gets its own combined-copy page rather than picking a
 * winner between the two, since the report is genuinely invalidated by both
 * causes at once.
 * @param {string[]} reasons
 * @returns {'reportInvalidated' | 'prnCancelled' | 'summaryLogChanged'}
 */
const translationKeyPrefixFor = (reasons) => {
  const hasSummaryLogChanged = reasons.includes(
    STALE_REASON.SUMMARY_LOG_CHANGED
  )
  const hasPrnCancelled = reasons.includes(STALE_REASON.PRN_CANCELLED)

  if (hasSummaryLogChanged && hasPrnCancelled) {
    return 'reportInvalidated'
  }
  if (hasPrnCancelled) {
    return 'prnCancelled'
  }
  return 'summaryLogChanged'
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest & { params: PeriodParams }>>} */
export const reportStaleErrorGetController = {
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

    const context =
      /** @type {{ periodPath: string, reasons: string[] } | undefined} */ (
        request.yar.get('reportStaleErrorContext')
      )
    if (context?.periodPath !== periodBase) {
      return h.redirect(reportsUrl)
    }

    request.yar.clear('reportStaleErrorContext')

    const prefix = translationKeyPrefixFor(context.reasons)

    return h.view('reports/report-stale-error', {
      pageTitle: localise(`reports:${prefix}PageTitle`),
      heading: localise(`reports:${prefix}Heading`),
      bodyLine1: localise(`reports:${prefix}BodyLine1`),
      bodyLine2: localise(`reports:${prefix}BodyLine2`),
      returnToReportsUrl: reportsUrl
    })
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest & { params: PeriodParams }>>} */
export const reportStaleErrorPostController = {
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
