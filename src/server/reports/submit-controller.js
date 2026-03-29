import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime } from '#server/common/helpers/format-time.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { isExporterRegistration } from '#server/common/helpers/prns/registration-helpers.js'
import { SUBMISSION_STATUS } from './constants.js'
import {
  buildDestinationDetailRows,
  buildOverseasSiteDetailRows,
  buildSupplierDetailRows,
  getTotalTonnageSentOn
} from './helpers/build-table-rows.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { updateReportStatus } from './helpers/update-report-status.js'
import { versionedPayloadSchema } from './helpers/versioned-payload-schema.js'

/**
 * @param {Array<{changedBy: {name: string}, changedAt: string}>} statusHistory
 * @param {(key: string, params?: Record<string, string>) => string} localise
 * @returns {{ createdBy: string, createdOn: string }}
 */
function getCreationDetails(statusHistory, localise) {
  const { changedBy, changedAt } = statusHistory[0]

  return {
    createdBy: changedBy.name,
    createdOn: localise('reports:submitCreatedOnValue', {
      date: formatDate(changedAt),
      time: formatTime(changedAt)
    })
  }
}

/**
 * @param {object} exportActivity
 * @returns {object}
 */
function buildWasteExportedViewData(exportActivity) {
  return {
    totalTonnage: exportActivity.totalTonnageReceivedForExporting,
    overseasSiteDetailRows: buildOverseasSiteDetailRows(
      exportActivity.overseasSites
    ),
    tonnageReceivedNotExported: exportActivity.tonnageReceivedNotExported,
    tonnageRefusedOrStopped:
      (exportActivity.tonnageRefusedAtRecepientDestination ?? 0) +
      (exportActivity.tonnageStoppedDuringExport ?? 0),
    tonnageRefused: exportActivity.tonnageRefusedAtRecepientDestination ?? 0,
    tonnageStopped: exportActivity.tonnageStoppedDuringExport ?? 0,
    tonnageRepatriated: exportActivity.tonnageRepatriated ?? 0
  }
}

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
    const isExporter = isExporterRegistration(registration)

    const { recyclingActivity, exportActivity, wasteSent } = reportDetail

    const { createdBy, createdOn } = getCreationDetails(
      reportDetail.statusHistory,
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
        totalTonnage: recyclingActivity.totalTonnageReceived,
        supplierDetailRows: buildSupplierDetailRows(recyclingActivity.suppliers)
      },

      // Waste exported (exporters only)
      wasteExported: exportActivity
        ? buildWasteExportedViewData(exportActivity)
        : null,

      // Waste sent on
      wasteSentOn: {
        totalTonnage: getTotalTonnageSentOn(wasteSent),
        toReprocessors: wasteSent.tonnageSentToReprocessor,
        toExporters: wasteSent.tonnageSentToExporter,
        toOtherSites: wasteSent.tonnageSentToAnotherSite,
        destinationDetailRows: buildDestinationDetailRows(
          wasteSent.finalDestinations
        )
      },

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
      version: reportDetail.version
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
