import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { readsAsARegulator } from '#server/auth/reads-as-a-regulator.js'
import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime } from '#server/common/helpers/format-time.js'
import { fetchRegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { siteNameOf } from '#server/common/helpers/organisations/site-name.js'
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
import { buildReportBreadcrumbs } from './helpers/build-report-breadcrumbs.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabelWithComma } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import {
  summaryLogUploadPath,
  reportPath,
  reportsListPath
} from './helpers/report-paths.js'
import { validateCadenceForRegistration } from './helpers/validate-cadence.js'
import { SUBMISSION_STATUS } from './constants.js'

/**
 * @param {object|undefined} exportActivity
 * @param {boolean} isExporter
 * @param {boolean} isAccreditedExporter
 * @param {string} fallbackText
 * @returns {object|null}
 */
function buildWasteExported(
  exportActivity,
  isExporter,
  isAccreditedExporter,
  fallbackText
) {
  if (!isExporter || !exportActivity) {
    return null
  }

  return {
    totalTonnage: formatTonnage(exportActivity.totalTonnageExported),
    overseasSiteDetailRows: buildOverseasSiteDetailRows(
      exportActivity.overseasSites,
      { showApprovalColumn: isAccreditedExporter },
      fallbackText
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
 * @param {RegistrationKeys & { year: number }} keys
 * @param {string} uploadPath
 * @param {RegistrationView} registration
 * @param {Accreditation | undefined} accreditation
 * @param {object} reportDetail
 * @param {(key: string, params?: object) => string} localise
 * @param {(path: string) => string} localiseUrl
 */
function buildViewData(
  keys,
  uploadPath,
  registration,
  accreditation,
  reportDetail,
  localise,
  localiseUrl
) {
  const material = getMaterialDisplayName(registration.material)
  const periodLabel = formatPeriodLabelWithComma(
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
  const fallbackText = localise('reports:noneProvided')

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
    backUrl: localiseUrl(reportsListPath(keys)),
    uploadUrl: localiseUrl(uploadPath),
    lastUploadedAt: reportDetail.source?.lastUploadedAt
      ? {
          date: formatDate(reportDetail.source.lastUploadedAt),
          time: formatTime(reportDetail.source.lastUploadedAt)
        }
      : null,
    accreditation: accreditation?.accreditationNumber,
    registrationNumber: keys.registrationNumber,
    site: siteNameOf(registration),
    wasteReceived: {
      totalTonnage: formatTonnage(recyclingActivity.totalTonnageReceived),
      supplierRows: buildSupplierRows(recyclingActivity.suppliers, fallbackText)
    },
    showApprovalColumn: isAccreditedExporter,
    wasteExported: buildWasteExported(
      exportActivity,
      isExporter,
      isAccreditedExporter,
      fallbackText
    ),
    wasteSentOn: {
      totalTonnage: formatTonnage(getTotalTonnageSentOn(wasteSent)),
      toReprocessors: formatTonnage(wasteSent.tonnageSentToReprocessor),
      toExporters: formatTonnage(wasteSent.tonnageSentToExporter),
      toOtherSites: formatTonnage(wasteSent.tonnageSentToAnotherSite),
      destinationRows: buildDestinationRows(
        wasteSent.finalDestinations,
        fallbackText
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
    const { organisationNumber, registrationNumber, year, cadence } =
      request.params
    const session = request.auth.credentials
    const { t: localise } = request

    const { organisation, registration, accreditation } =
      await fetchRegistrationWithAccreditation(
        { organisationNumber, registrationNumber, year },
        session.backendToken
      )

    validateCadenceForRegistration(cadence, accreditation)

    const reportDetail = await fetchReportDetail(
      request.params,
      session.backendToken
    )

    if (reportDetail.status !== SUBMISSION_STATUS.NOT_STARTED) {
      return h.redirect(request.localiseUrl(reportsListPath(request.params)))
    }

    const basePath = reportPath(request.params)
    const uploadPath = summaryLogUploadPath(request.params)

    if (reportDetail.incompleteSummaryLogRows) {
      request.yar.set('reportDataIncompleteContext', {
        periodPath: basePath,
        uploadPath,
        payload: reportDetail.incompleteSummaryLogRows
      })
      return h.redirect(
        request.localiseUrl(`${basePath}/report-data-incomplete`)
      )
    }

    const viewData = buildViewData(
      request.params,
      uploadPath,
      registration,
      accreditation,
      reportDetail,
      localise,
      request.localiseUrl.bind(request)
    )

    return h.view('reports/detail', {
      ...viewData,
      breadcrumbs: readsAsARegulator(session)
        ? buildReportBreadcrumbs({
            organisation,
            registration,
            keys: request.params,
            pageName: viewData.heading,
            year,
            cadence,
            localise,
            localiseUrl: request.localiseUrl.bind(request)
          })
        : []
    })
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { Accreditation, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 * @import { RegistrationKeys } from './helpers/report-paths.js'
 */
