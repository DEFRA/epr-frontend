import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { isExporterRegistration } from '#server/common/helpers/prns/registration-helpers.js'
import { SUBMISSION_STATUS } from './constants.js'
import {
  buildDestinationRows,
  buildOverseasSiteRows,
  buildSupplierRows,
  getTotalTonnageSentOn
} from './helpers/build-table-rows.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { updateReport } from './helpers/update-report.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const checkGetController = {
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

    const { registration } = await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      session.idToken
    )

    const reportDetail = await fetchReportDetail(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      session.idToken
    )

    const material = getDisplayMaterial(registration)
    const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)

    const { recyclingActivity, exportActivity, wasteSent } = reportDetail
    const isExporter = isExporterRegistration(registration)
    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}`

    const viewData = {
      pageTitle: localise('reports:checkPageTitle', { material, periodLabel }),
      caption: localise('reports:checkCaption'),
      heading: localise('reports:checkHeading'),
      material,
      periodLabel,
      isExporter,
      backUrl: request.localiseUrl(`${basePath}/supporting-information`),
      changeUrl: request.localiseUrl(`${basePath}/supporting-information`),
      createButtonText: localise('reports:checkCreateReport'),
      supportingInformation:
        reportDetail.supportingInformation ||
        localise('reports:supportingInformationNone'),
      supportingInformationLabel: localise(
        'reports:supportingInformationLabel'
      ),
      changeText: localise('reports:supportingInformationChange'),
      wasteReceived: {
        totalTonnage: recyclingActivity.totalTonnageReceived,
        supplierRows: buildSupplierRows(recyclingActivity.suppliers)
      },
      wasteExported: exportActivity
        ? {
            totalTonnage: exportActivity.totalTonnageReceivedForExporting,
            overseasSiteRows: buildOverseasSiteRows(
              exportActivity.overseasSites
            )
          }
        : null,
      wasteSentOn: {
        totalTonnage: getTotalTonnageSentOn(wasteSent),
        toReprocessors: wasteSent.tonnageSentToReprocessor,
        toExporters: wasteSent.tonnageSentToExporter,
        toOtherSites: wasteSent.tonnageSentToAnotherSite,
        destinationRows: buildDestinationRows(wasteSent.finalDestinations)
      }
    }

    return h.view('reports/check-your-answers', viewData)
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const checkPostController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  async handler(request, h) {
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const session = request.auth.credentials

    await updateReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      { status: SUBMISSION_STATUS.READY_TO_SUBMIT },
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
 * @import { ServerRoute } from '@hapi/hapi'
 */
