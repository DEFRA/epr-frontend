import Boom from '@hapi/boom'

import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabelWithComma } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { isResubmission } from './helpers/resubmission.js'

/**
 * Whether the explainer shows the operator-initiated copy. It does when the
 * operator self-requested resubmission ("Use this report's summary log"). A
 * summary-log restatement of the closed period — or no recorded cause — keeps
 * the original data-changed copy. When both causes are recorded, the most
 * recent one wins.
 * @param {ReportDetailResponse['resubmissionRequired']} [resubmissionRequired]
 * @returns {boolean}
 */
function isOperatorInitiated(resubmissionRequired) {
  const requestedAt = resubmissionRequired?.operatorRequested?.requestedAt
  if (!requestedAt) {
    return false
  }
  const restatedAt = resubmissionRequired?.closedPeriodRestated?.uploadedAt
  // The two timestamps come from separate backend write paths; parse to epoch
  // so ordering doesn't depend on their ISO-8601 serialisation matching.
  return !restatedAt || Date.parse(requestedAt) >= Date.parse(restatedAt)
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const resubmissionExplainerController = {
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
    const { t: localise } = request

    if (!isResubmission(submissionNumber)) {
      throw Boom.notFound()
    }

    // The resubmission cause is recorded on the submitted report
    // (submissionNumber - 1); this page sits on the new draft's submission.
    // That prior submission is always a submitted report, and the backend never
    // flags submitted reports as stale, so fetchReportDetail cannot throw
    // ReportStaleError here the way it can on an in-progress draft.
    const report = await fetchReportDetail(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber - 1,
      request.auth.credentials.idToken
    )
    const keyPrefix = isOperatorInitiated(report.resubmissionRequired)
      ? 'reports:resubmissionExplainerOperator'
      : 'reports:resubmissionExplainer'

    const periodLabel = formatPeriodLabelWithComma(
      { year, period },
      cadence,
      localise
    )

    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports`
    const periodPath = `${basePath}/${year}/${cadence}/${period}/submissions/${submissionNumber}`

    return h.view('reports/resubmission-explainer', {
      pageTitle: localise(`${keyPrefix}PageTitle`, {
        periodLabel
      }),
      caption: localise('reports:createDraftReportCaption'),
      heading: localise(`${keyPrefix}Heading`, {
        periodLabel
      }),
      paragraph1: localise(`${keyPrefix}Para1`),
      paragraph2: localise(`${keyPrefix}Para2`),
      paragraph3: localise('reports:resubmissionExplainerPara3', {
        periodLabel
      }),
      backUrl: request.localiseUrl(basePath),
      continueButton: {
        text: localise('reports:resubmissionExplainerContinue'),
        href: request.localiseUrl(periodPath)
      },
      cancelLink: {
        text: localise('reports:resubmissionExplainerCancel'),
        href: request.localiseUrl(basePath)
      }
    })
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 * @import { ReportDetailResponse } from './helpers/fetch-report-detail.js'
 */
