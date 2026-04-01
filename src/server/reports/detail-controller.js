import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime } from '#server/common/helpers/format-time.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { isExporterRegistration } from '#server/common/helpers/prns/registration-helpers.js'
import {
  buildDestinationRows,
  buildOverseasSiteDetailRows,
  buildSupplierRows,
  getTotalTonnageSentOn
} from './helpers/build-table-rows.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const detailController = {
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

    const { registration, accreditation } =
      await fetchRegistrationAndAccreditation(
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
    const periodLabel = formatPeriodLabel(
      { year: reportDetail.year, period: reportDetail.period },
      reportDetail.cadence,
      localise
    )

    const { recyclingActivity, exportActivity, wasteSent } = reportDetail
    const isExporter = isExporterRegistration(registration)

    const viewData = {
      pageTitle: localise('reports:detailPageTitle', { material, periodLabel }),
      heading: localise('reports:detailHeading', { periodLabel }),
      material,
      periodLabel,
      isExporter,
      backUrl: request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}/reports`
      ),
      uploadUrl: request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`
      ),
      lastUploadedAt: reportDetail.lastUploadedAt
        ? {
            date: formatDate(reportDetail.lastUploadedAt, {
              includeYear: false
            }),
            time: formatTime(reportDetail.lastUploadedAt)
          }
        : null,
      accreditation: accreditation?.accreditationNumber,
      site: reportDetail.details.site,
      wasteReceived: {
        totalTonnage: recyclingActivity.totalTonnageReceived,
        supplierRows: buildSupplierRows(recyclingActivity.suppliers)
      },
      wasteExported: exportActivity
        ? {
            totalTonnage: exportActivity.totalTonnageExported,
            overseasSiteDetailRows: buildOverseasSiteDetailRows(
              exportActivity.overseasSites
            ),
            tonnageReceivedNotExported:
              exportActivity.tonnageReceivedNotExported,
            tonnageRefusedOrStopped:
              exportActivity.totalTonnageRefusedOrStopped,
            tonnageRefused: exportActivity.tonnageRefusedAtDestination,
            tonnageStopped: exportActivity.tonnageStoppedDuringExport,
            tonnageRepatriated: exportActivity.tonnageRepatriated
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

    return h.view('reports/detail', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
