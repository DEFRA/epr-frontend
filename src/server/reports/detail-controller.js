import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime } from '#server/common/helpers/format-time.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import {
  getNoteTypeDisplayNames,
  isExporterRegistration,
  isReprocessorRegistration
} from '#server/common/helpers/prns/registration-helpers.js'
import {
  buildDestinationRows,
  buildOverseasSiteDetailRows,
  buildSupplierRows,
  buildUnapprovedOverseasSiteDetailRows,
  getTotalTonnageSentOn
} from './helpers/build-table-rows.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { validateCadenceForRegistration } from './helpers/validate-cadence.js'

/**
 * @param {object|undefined} exportActivity
 * @param {boolean} isExporter
 * @param {boolean} isAccreditedExporter
 * @param {string} noneText
 * @returns {object|null}
 */
function buildWasteExported(
  exportActivity,
  isExporter,
  isAccreditedExporter,
  noneText
) {
  if (!isExporter || !exportActivity) {
    return null
  }

  return {
    totalTonnage: formatTonnage(exportActivity.totalTonnageExported),
    overseasSiteDetailRows: buildOverseasSiteDetailRows(
      exportActivity.overseasSites,
      { showApprovalColumn: isAccreditedExporter },
      noneText
    ),
    unapprovedOverseasSiteDetailRows: buildUnapprovedOverseasSiteDetailRows(
      exportActivity.unapprovedOverseasSites
    ),
    tonnageReceivedNotExported: formatTonnage(
      exportActivity.tonnageReceivedNotExported
    ),
    tonnageRefusedOrStopped: formatTonnage(
      exportActivity.totalTonnageRefusedOrStopped
    ),
    tonnageRefused: formatTonnage(exportActivity.tonnageRefusedAtDestination),
    tonnageStopped: formatTonnage(exportActivity.tonnageStoppedDuringExport),
    tonnageRepatriated: formatTonnage(exportActivity.tonnageRepatriated)
  }
}

/**
 * @param {boolean} isAccreditedExporter
 * @param {boolean} isAccreditedReprocessor
 * @param {(key: string) => string} localise
 * @returns {object}
 */
function buildSectionIntros(
  isAccreditedExporter,
  isAccreditedReprocessor,
  localise
) {
  return {
    wasteSentOnIntroReprocessor: localise(
      isAccreditedReprocessor
        ? 'reports:wasteSentOnIntroAccreditedReprocessor'
        : 'reports:wasteSentOnIntroReprocessor'
    ),
    wasteSentOnIntroExporter: localise('reports:wasteSentOnIntroExporter'),
    wasteReceivedIntroReprocessor: localise(
      isAccreditedReprocessor
        ? 'reports:wasteReceivedIntroAccreditedReprocessor'
        : 'reports:wasteReceivedIntroReprocessorRegOnly'
    ),
    wasteReceivedForExportIntro: isAccreditedExporter
      ? localise('reports:wasteReceivedForExportIntro')
      : localise('reports:wasteReceivedForExportIntroRegOnly'),
    wasteExportedIntro: isAccreditedExporter
      ? localise('reports:wasteExportedIntro')
      : localise('reports:wasteExportedIntroRegOnly'),
    tonnageReceivedNotExportedIntro: isAccreditedExporter
      ? localise('reports:tonnageReceivedNotExportedIntro')
      : localise('reports:tonnageReceivedNotExportedIntroRegOnly'),
    tonnageRefusedOrStoppedIntro: isAccreditedExporter
      ? localise('reports:tonnageRefusedOrStoppedIntro')
      : localise('reports:tonnageRefusedOrStoppedIntroRegOnly')
  }
}

/**
 * @param {{ organisationId: string, registrationId: string }} ids
 * @param {object} registration
 * @param {object | undefined} accreditation
 * @param {object} reportDetail
 * @param {(key: string, params?: object) => string} localise
 * @param {(path: string) => string} localiseUrl
 */
function buildViewData(
  { organisationId, registrationId },
  registration,
  accreditation,
  reportDetail,
  localise,
  localiseUrl
) {
  const material = getDisplayMaterial(registration)
  const periodLabel = formatPeriodLabel(
    { year: reportDetail.year, period: reportDetail.period },
    reportDetail.cadence,
    localise
  )
  const { recyclingActivity, exportActivity, wasteSent } = reportDetail
  const isExporter = isExporterRegistration(registration)
  const isAccreditedExporter = isExporter && !!accreditation
  const isAccreditedReprocessor =
    isReprocessorRegistration(registration) && !!accreditation
  const { wasteActionGerund } = getNoteTypeDisplayNames(registration)
  const noneText = localise('reports:noneProvided')

  return {
    pageTitle: localise('reports:detailPageTitle', { material, periodLabel }),
    heading: localise('reports:detailHeading', { periodLabel }),
    material,
    periodLabel,
    isExporter,
    isRegisteredOnlyExporter: isExporter && !accreditation,
    wasteReceivedHeading: localise('reports:wasteReceivedHeading', {
      wasteActionGerund
    }),
    backUrl: localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/reports`
    ),
    uploadUrl: localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`
    ),
    lastUploadedAt: reportDetail.source?.lastUploadedAt
      ? {
          date: formatDate(reportDetail.source.lastUploadedAt),
          time: formatTime(reportDetail.source.lastUploadedAt)
        }
      : null,
    accreditation: accreditation?.accreditationNumber,
    registrationNumber: registration.registrationNumber,
    site: reportDetail.details.site,
    wasteReceived: {
      totalTonnage: formatTonnage(recyclingActivity.totalTonnageReceived),
      supplierRows: buildSupplierRows(recyclingActivity.suppliers, noneText)
    },
    showApprovalColumn: isAccreditedExporter,
    wasteExported: buildWasteExported(
      exportActivity,
      isExporter,
      isAccreditedExporter,
      noneText
    ),
    wasteSentOn: {
      totalTonnage: formatTonnage(getTotalTonnageSentOn(wasteSent)),
      toReprocessors: formatTonnage(wasteSent.tonnageSentToReprocessor),
      toExporters: formatTonnage(wasteSent.tonnageSentToExporter),
      toOtherSites: formatTonnage(wasteSent.tonnageSentToAnotherSite),
      destinationRows: buildDestinationRows(
        wasteSent.finalDestinations,
        noneText
      )
    },
    ...buildSectionIntros(
      isAccreditedExporter,
      isAccreditedReprocessor,
      localise
    )
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const detailController = {
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
    const {
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber
    } = request.params
    const session = request.auth.credentials
    const { t: localise } = request

    const { registration, accreditation } =
      await fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        session.idToken
      )

    validateCadenceForRegistration(cadence, accreditation)

    const reportDetail = await fetchReportDetail(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber,
      session.idToken
    )

    if (reportDetail.id) {
      return h.redirect(
        request.localiseUrl(
          `/organisations/${organisationId}/registrations/${registrationId}/reports`
        )
      )
    }

    const viewData = buildViewData(
      { organisationId, registrationId },
      registration,
      accreditation,
      reportDetail,
      localise,
      request.localiseUrl.bind(request)
    )

    return h.view('reports/detail', viewData)
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 */
