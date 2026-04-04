import Boom from '@hapi/boom'
import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { buildSupplierDetailRows } from './helpers/build-table-rows.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
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

    if (reportDetail.status?.currentStatus !== SUBMISSION_STATUS.SUBMITTED) {
      throw Boom.notFound()
    }

    const material = getDisplayMaterial(registration)
    const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)
    const { recyclingActivity } = reportDetail

    const viewData = {
      pageTitle: localise('reports:viewPageTitle'),
      heading: localise('reports:viewHeading', { periodLabel }),
      backUrl: request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}/reports`
      ),

      material,
      periodLabel,
      site: registration.site?.address?.line1,

      wasteReceived: {
        totalTonnage: formatTonnage(recyclingActivity.totalTonnageReceived),
        supplierDetailRows: buildSupplierDetailRows(recyclingActivity.suppliers)
      }
    }
    return h.view('reports/view', viewData)
  }
}
