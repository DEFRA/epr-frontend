import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime } from '#server/common/helpers/format-time.js'
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

/** @import { ReportDetailResponse } from './helpers/fetch-report-detail.js' */

/**
 * @param {{ at: string, by: { name: string } }} statusCreated
 * @param {(key: string, params?: Record<string, string>) => string} localise
 * @returns {{ createdBy: string, createdOn: string }}
 */
function getCreationDetails(statusCreated, localise) {
  const { by, at } = statusCreated

  return {
    createdBy: by.name,
    createdOn: localise('reports:submitCreatedOnValue', {
      date: formatDate(at),
      time: formatTime(at)
    })
  }
}

/**
 * @param {object} exportActivity
 * @returns {object}
 */
function buildWasteExportedViewData(exportActivity) {
  return {
    totalTonnage: formatTonnage(exportActivity.totalTonnageExported),
    overseasSiteRows: buildOverseasSiteRows(exportActivity.overseasSites),
    ...formatExportTonnages(exportActivity)
  }
}

/**
 * @typedef {{
 *   destinationDetailRows: Array<Array<{text: string}>>,
 *   toExporters: string,
 *   toOtherSites: string,
 *   toReprocessors: string,
 *   totalTonnage: string
 * }} WasteSentOnViewData
 */

/**
 * @param {ReportDetailResponse['wasteSent']} wasteSent
 * @returns {WasteSentOnViewData}
 */
const buildWasteSentOnViewData = (wasteSent) => ({
  destinationDetailRows: buildDestinationDetailRows(
    wasteSent.finalDestinations
  ),
  toExporters: formatTonnage(wasteSent.tonnageSentToExporter),
  toOtherSites: formatTonnage(wasteSent.tonnageSentToAnotherSite),
  toReprocessors: formatTonnage(wasteSent.tonnageSentToReprocessor),
  totalTonnage: formatTonnage(getTotalTonnageSentOn(wasteSent))
})

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const submitGetController = {
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

    const material = getDisplayMaterial(registration)
    const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)
    const { recyclingActivity, exportActivity, wasteSent } = reportDetail
    const isExporter = isExporterRegistration(registration)

    const { createdBy, createdOn } = getCreationDetails(
      reportDetail.status.created,
      localise
    )

    const reportsUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports`

    const viewData = {
      pageTitle: localise('reports:submitPageTitle', { material, periodLabel }),
      heading: localise('reports:submitHeading', { periodLabel }),
      isExporter,
      backUrl: request.localiseUrl(reportsUrl),

      // Inset text
      insetText: localise('reports:submitInsetText'),

      // Details section
      statusTag: localise('reports:statusReadyToSubmit'),
      createdByLabel: localise('reports:submitCreatedByLabel'),
      createdBy,
      createdOnLabel: localise('reports:submitCreatedOnLabel'),
      createdOn,

      // Your report summary list
      periodLabel,
      material,

      // Waste received
      wasteReceived: {
        totalTonnage: formatTonnage(recyclingActivity.totalTonnageReceived),
        supplierDetailRows: buildSupplierDetailRows(recyclingActivity.suppliers)
      },

      // Waste exported (exporters only)
      wasteExported: exportActivity
        ? buildWasteExportedViewData(exportActivity)
        : null,

      // Waste sent on
      wasteSentOn: buildWasteSentOnViewData(wasteSent),

      // Supporting information
      supportingInformation:
        reportDetail.supportingInformation ||
        localise('reports:supportingInformationNone'),

      // Declaration
      declarationItems: [
        localise('reports:submitDeclarationItem1'),
        localise('reports:submitDeclarationItem2'),
        localise('reports:submitDeclarationItem3')
      ],

      // Form
      version: reportDetail.version,

      deleteUrl: request.localiseUrl(
        `${reportsUrl}/${year}/${cadence}/${period}/delete`
      )
    }

    return h.view('reports/submit', viewData)
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const submitPostController = {
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

    const transition = { status: SUBMISSION_STATUS.SUBMITTED, version }

    await updateReportStatus(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      transition,
      session.idToken
    )

    request.yar.set('reportSubmitted', { year, cadence, period })

    return h.redirect(
      request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/submitted`
      )
    )
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
