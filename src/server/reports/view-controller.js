import Boom from '@hapi/boom'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { SUBMISSION_STATUS } from './constants.js'

/**
 * @satisfies {Partial<import('@hapi/hapi').ServerRoute>}
 */
export const viewGetController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  async handler(request, h) {
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const session = request.auth.credentials
    const { t: localise } = request

    const reportDetail = await fetchReportDetail(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      session.idToken
    )

    if (reportDetail.status?.currentStatus !== SUBMISSION_STATUS.SUBMITTED) {
      throw Boom.notFound()
    }

    const viewData = {
      pageTitle: localise('reports:viewPageTitle'),
      heading: localise('reports:viewHeading', {
        periodLabel: formatPeriodLabel({ year, period }, cadence, localise)
      }),
      backUrl: request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}/reports`
      )
    }
    return h.view('reports/view', viewData)
  }
}
