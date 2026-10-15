import Boom from '@hapi/boom'

import { fetchRegistrationAndAccreditationByNumber } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getRegistrationMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { SUBMISSION_STATUS } from './constants.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { reportPath, reportsListPath } from './helpers/report-paths.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const submittedController = {
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
    const { organisationNumber, registrationNumber, year, cadence, period } =
      request.params
    const session = request.auth.credentials
    const { t: localise } = request

    const reportsUrl = reportsListPath(request.params)

    const { registration } = await fetchRegistrationAndAccreditationByNumber(
      organisationNumber,
      registrationNumber,
      session
    )
    const reportDetail = await fetchReportDetail(
      request.params,
      session.backendToken
    )

    if (reportDetail.status !== SUBMISSION_STATUS.SUBMITTED) {
      throw Boom.notFound()
    }

    const material = getRegistrationMaterialDisplayName(registration)
    const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)

    return h.view('reports/submitted', {
      pageTitle: localise('reports:submittedPageTitle', {
        material,
        periodLabel
      }),
      heading: localise('reports:submittedHeading', { periodLabel }),
      detailsHeading: localise('reports:submittedDetailsHeading'),
      registrationLabel: localise('reports:submittedRegistrationLabel'),
      registrationNumber: registration.registrationNumber,
      materialLabel: localise('reports:submittedMaterialLabel'),
      material,
      futureChangesGuidance: localise('reports:submittedFutureChangesGuidance'),
      returnToReportsLink: {
        text: localise('reports:submittedReturnToReports'),
        href: request.localiseUrl(reportsUrl)
      },
      viewReportLink: {
        text: localise('reports:submittedViewReport'),
        href: request.localiseUrl(`${reportPath(request.params)}/view`)
      }
    })
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 */
