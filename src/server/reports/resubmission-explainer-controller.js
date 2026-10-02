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
    // N-1 is always an already-submitted, stored report, so the backend returns
    // it without re-aggregating and never flags it stale. Even so, this lookup
    // only chooses between two wordings: a backend failure must not error-page
    // the operator off the flow, so fall back to the original data-changed copy
    // when the cause cannot be determined.
    let resubmissionRequired
    try {
      const report = await fetchReportDetail(
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        submissionNumber - 1,
        request.auth.credentials.backendToken
      )
      resubmissionRequired = report.resubmissionRequired
    } catch (error) {
      request.logger.warn({
        message:
          'Failed to fetch prior report for resubmission explainer; showing data-changed copy',
        err: error
      })
    }
    const keyPrefix = isOperatorInitiated(resubmissionRequired)
      ? 'reports:resubmissionExplainerOperator'
      : 'reports:resubmissionExplainer'

    const periodLabel = formatPeriodLabelWithComma(
      { year, period },
      cadence,
      localise
    )

    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports`
    const periodPath = `${basePath}/${year}/${cadence}/${period}/submissions/${submissionNumber}`

    // The page title and heading are the same string on this page.
    const title = localise(`${keyPrefix}Heading`, { periodLabel })

    return h.view('reports/resubmission-explainer', {
      pageTitle: title,
      caption: localise('reports:createDraftReportCaption'),
      heading: title,
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
