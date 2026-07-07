import Boom from '@hapi/boom'

import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { isResubmission } from './helpers/resubmission.js'

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
  handler(request, h) {
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

    const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)

    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports`
    const periodPath = `${basePath}/${year}/${cadence}/${period}/submissions/${submissionNumber}`

    return h.view('reports/resubmission-explainer', {
      pageTitle: localise('reports:resubmissionExplainerPageTitle', {
        periodLabel
      }),
      caption: localise('reports:resubmissionExplainerCaption'),
      heading: localise('reports:resubmissionExplainerHeading', {
        periodLabel
      }),
      paragraph1: localise('reports:resubmissionExplainerPara1'),
      paragraph2: localise('reports:resubmissionExplainerPara2'),
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
 */
