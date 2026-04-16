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
import { SUBMISSION_STATUS } from './constants.js'
import {
  buildDestinationDetailRows,
  buildOverseasSiteRows,
  buildSupplierDetailRows,
  buildUnapprovedOverseasSiteRows,
  getTotalTonnageSentOn
} from './helpers/build-table-rows.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatExportTonnages } from './helpers/format-export-tonnages.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { updateReportStatus } from './helpers/update-report-status.js'
import { versionedPayloadSchema } from './helpers/versioned-payload-schema.js'

/**
 * @import { ServerRoute, ResponseToolkit } from '@hapi/hapi'
 * @import { CadenceValue } from './constants.js'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 * @import { ReportDetailResponse } from './helpers/fetch-report-detail.js'
 * @import { VersionedPayload } from './helpers/versioned-payload-schema.js'
 */

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

const defaultExportActivity = {
  totalTonnageExported: 0,
  overseasSites: [],
  tonnageReceivedNotExported: null,
  tonnageRefusedAtDestination: null,
  tonnageStoppedDuringExport: null,
  totalTonnageRefusedOrStopped: null,
  tonnageRepatriated: null
}

/**
 * @param {object|null|undefined} exportActivity
 * @param {boolean} isExporter
 * @param {boolean} isAccreditedExporter
 * @returns {object|null}
 */
function buildWasteExported(exportActivity, isExporter, isAccreditedExporter) {
  if (!isExporter) {
    return null
  }

  const activity = exportActivity ?? defaultExportActivity
  return {
    totalTonnage: formatTonnage(activity.totalTonnageExported),
    overseasSiteRows: buildOverseasSiteRows(activity.overseasSites, {
      showApprovalColumn: isAccreditedExporter
    }),
    unapprovedOverseasSiteRows: buildUnapprovedOverseasSiteRows(
      activity.unapprovedOverseasSites ?? []
    ),
    ...formatExportTonnages(activity)
  }
}

/**
 * @typedef {{
 *   destinationDetailRows: Array<Array<{text: string | null}>>,
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
  /**
   * @param {HapiRequest & { params: PeriodParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const session = request.auth.credentials
    const { t: localise } = request

    const [{ registration, accreditation }, reportDetail] = await Promise.all([
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

    const status = /** @type {NonNullable<ReportDetailResponse['status']>} */ (
      reportDetail.status
    )

    const viewData = buildViewData({
      registration,
      accreditation,
      reportDetail,
      status,
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      localise,
      localiseUrl: (url) => request.localiseUrl(url)
    })

    return h.view('reports/submit', viewData)
  }
}

/**
 * @param {{ localise: (key: string, params?: Record<string, string>) => string, material: string, periodLabel: string, noteTypePlural: string, wasteActionGerund: string }} params
 * @returns {object}
 */
function buildPageLabels({
  localise,
  material,
  periodLabel,
  noteTypePlural,
  wasteActionGerund
}) {
  return {
    pageTitle: localise('reports:submitPageTitle', { material, periodLabel }),
    heading: localise('reports:submitHeading', { periodLabel }),
    wasteReceivedHeading: localise('reports:wasteReceivedHeading', {
      wasteActionGerund
    }),
    noteTypeSectionHeading: localise('reports:noteTypeSectionHeading', {
      noteTypePlural
    }),
    totalIssuedTonnageLabel: localise('reports:totalIssuedTonnage', {
      noteTypePlural
    }),
    freeLabel: localise('reports:submitFreeLabel', { noteTypePlural }),
    revenueLabel: localise('reports:submitTotalRevenue', { noteTypePlural }),
    avgPriceLabel: localise('reports:submitAvgPrice', { noteTypePlural })
  }
}

/**
 * @param {ReportDetailResponse['recyclingActivity']} recyclingActivity
 * @returns {{ totalTonnage: string, supplierDetailRows: Array<Array<{text: string | null}>> }}
 */
const buildWasteReceivedViewData = (recyclingActivity) => ({
  totalTonnage: formatTonnage(recyclingActivity.totalTonnageReceived),
  supplierDetailRows: buildSupplierDetailRows(recyclingActivity.suppliers)
})

/**
 * @param {ReportDetailResponse['recyclingActivity']} recyclingActivity
 * @returns {{ tonnageRecycled: string, tonnageNotRecycled: string }}
 */
const buildRecyclingActivityViewData = (recyclingActivity) => ({
  tonnageRecycled: formatTonnage(recyclingActivity.tonnageRecycled),
  tonnageNotRecycled: formatTonnage(recyclingActivity.tonnageNotRecycled)
})

/**
 * @param {{
 *   registration: object,
 *   accreditation: object | undefined,
 *   reportDetail: ReportDetailResponse,
 *   status: NonNullable<ReportDetailResponse['status']>,
 *   organisationId: string,
 *   registrationId: string,
 *   year: number,
 *   cadence: CadenceValue,
 *   period: number,
 *   localise: (key: string, params?: Record<string, string>) => string,
 *   localiseUrl: (url: string) => string
 * }} params
 * @returns {object}
 */
function buildViewData({
  registration,
  accreditation,
  reportDetail,
  status,
  organisationId,
  registrationId,
  year,
  cadence,
  period,
  localise,
  localiseUrl
}) {
  const material = getDisplayMaterial(registration)
  const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)
  const { recyclingActivity, exportActivity, wasteSent } = reportDetail
  const isExporter = isExporterRegistration(registration)
  const isAccreditedExporter = isExporter && !!accreditation
  const isRegisteredOnlyExporter = isExporter && !accreditation
  const { noteTypePlural, wasteActionGerund } =
    getNoteTypeDisplayNames(registration)

  const { createdBy, createdOn } = getCreationDetails(status.created, localise)

  const reportsUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports`

  return {
    ...buildPageLabels({
      localise,
      material,
      periodLabel,
      noteTypePlural,
      wasteActionGerund
    }),
    isAccredited: !!accreditation,
    isReprocessor: isReprocessorRegistration(registration),
    isExporter,
    isRegisteredOnlyExporter,
    showApprovalColumn: isAccreditedExporter,
    backUrl: localiseUrl(reportsUrl),

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
    site: reportDetail.details.site,

    // Waste received
    wasteReceived: buildWasteReceivedViewData(recyclingActivity),

    // Waste exported (exporters only — always show section with defaults)
    wasteExported: buildWasteExported(
      exportActivity,
      isExporter,
      isAccreditedExporter
    ),

    // Waste sent on
    wasteSentOn: buildWasteSentOnViewData(wasteSent),

    // PRNs
    prn: {
      averagePricePerTonne: reportDetail.prn?.averagePricePerTonne,
      freeTonnage: reportDetail.prn?.freeTonnage,
      issuedTonnage: reportDetail.prn?.issuedTonnage,
      totalRevenue: reportDetail.prn?.totalRevenue
    },

    // Recycling activity
    recyclingActivity: buildRecyclingActivityViewData(recyclingActivity),

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

    deleteUrl: localiseUrl(`${reportsUrl}/${year}/${cadence}/${period}/delete`)
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
  /**
   * @param {HapiRequest & {
   *   params: PeriodParams,
   *   payload: VersionedPayload
   * }} request
   * @param {ResponseToolkit} h
   */
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

    return h.redirect(
      request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/submitted`
      )
    )
  }
}
