import Boom from '@hapi/boom'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { formatDate } from '#server/common/helpers/format-date.js'
import { SUBMISSION_STATUS } from './constants.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const createdController = {
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
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const session = request.auth.credentials
    const { t: localise } = request

    const reportsUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports`

    const [{ registration }, reportDetail] = await Promise.all([
      fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        session.idToken
      ),
      fetchReportDetail(
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        session.idToken
      )
    ])

    if (
      reportDetail.status?.currentStatus !== SUBMISSION_STATUS.READY_TO_SUBMIT
    ) {
      throw Boom.notFound()
    }

    const material = getDisplayMaterial(registration)
    const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)
    const formattedDueDate = formatDate(reportDetail.dueDate)

    const homeUrl = `/organisations/${organisationId}`
    const viewDraftUrl = `${reportsUrl}/${year}/${cadence}/${period}/view`

    return h.view('reports/created', {
      pageTitle: localise('reports:createdPageTitle', {
        material,
        periodLabel
      }),
      heading: localise('reports:createdHeading', { periodLabel }),
      statusLabel: localise('reports:createdStatusLabel'),
      statusValue: localise('reports:createdStatusValue'),
      detailsHeading: localise('reports:detailsHeading'),
      registrationLabel: localise('reports:createdRegistrationLabel'),
      registrationNumber: registration.registrationNumber,
      materialLabel: localise('reports:createdMaterialLabel'),
      material,
      nextStepsHeading: localise('reports:createdNextStepsHeading'),
      nextStepsGuidance: localise('reports:createdNextStepsGuidance', {
        dueDate: formattedDueDate
      }),
      selfSubmitGuidance: localise('reports:createdSelfSubmitGuidance'),
      goToReportsButton: {
        text: localise('reports:createdGoToReports'),
        href: request.localiseUrl(reportsUrl)
      },
      viewDraftReportLink: {
        text: localise('reports:createdViewDraftReport'),
        href: request.localiseUrl(viewDraftUrl)
      },
      returnHomeLink: {
        text: localise('reports:createdReturnHome'),
        href: request.localiseUrl(homeUrl)
      }
    })
  }
}

/**
 * @import { ServerRoute, ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 */
