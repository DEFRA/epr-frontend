import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { isExporterRegistration } from '#server/common/helpers/prns/registration-helpers.js'
import { SUBMISSION_STATUS } from './constants.js'
import {
  buildDestinationDetailRows,
  buildOverseasSiteRows,
  buildSupplierDetailRows,
  getTotalTonnageSentOn
} from './helpers/build-table-rows.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatExportTonnages } from './helpers/format-export-tonnages.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { updateReportStatus } from './helpers/update-report-status.js'
import { versionedPayloadSchema } from './helpers/versioned-payload-schema.js'

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
    const cadenceLabel = localise(`reports:${cadence}Heading`)

    const { recyclingActivity, exportActivity, wasteSent } = reportDetail
    const isExporter = isExporterRegistration(registration)
    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}`

    const viewData = {
      pageTitle: localise('reports:checkPageTitle', { material, periodLabel }),
      caption: localise('reports:checkCaption'),
      heading: localise('reports:checkHeading'),
      material,
      periodLabel,
      cadenceLabel,
      registrationNumber: registration.registrationNumber,
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
      version: reportDetail.version,
      changeText: localise('reports:supportingInformationChange'),
      deleteUrl: request.localiseUrl(`${basePath}/delete`),
      wasteReceived: {
        totalTonnage: recyclingActivity.totalTonnageReceived,
        supplierDetailRows: buildSupplierDetailRows(recyclingActivity.suppliers)
      },
      wasteExported: exportActivity
        ? {
            totalTonnage: exportActivity.totalTonnageReceivedForExporting,
            overseasSiteRows: buildOverseasSiteRows(
              exportActivity.overseasSites
            ),
            ...formatExportTonnages(exportActivity)
          }
        : null,
      wasteSentOn: {
        totalTonnage: getTotalTonnageSentOn(wasteSent),
        toReprocessors: wasteSent.tonnageSentToReprocessor,
        toExporters: wasteSent.tonnageSentToExporter,
        toOtherSites: wasteSent.tonnageSentToAnotherSite,
        destinationDetailRows: buildDestinationDetailRows(
          wasteSent.finalDestinations
        )
      },
      prn: reportDetail.prn,
      prnRevenueChangeUrl: request.localiseUrl(`${basePath}/prn-summary`),
      freePernChangeUrl: request.localiseUrl(`${basePath}/free-perns`)
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
      params: periodParamsSchema,
      payload: versionedPayloadSchema
    }
  },
  async handler(request, h) {
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const { version } = request.payload
    const session = request.auth.credentials

    const transition = { status: SUBMISSION_STATUS.READY_TO_SUBMIT, version }

    await updateReportStatus(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      transition,
      session.idToken
    )

    request.yar.set('reportCreated', { year, cadence, period })

    return h.redirect(
      request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/created`
      )
    )
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
