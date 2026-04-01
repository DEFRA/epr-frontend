import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import {
  isExporterRegistration,
  isReprocessorRegistration
} from '#server/common/helpers/prns/registration-helpers.js'
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
 * @param {object} reportDetail
 * @param {(key: string) => string} localise
 * @returns {string}
 */
function getSupportingInformation(reportDetail, localise) {
  if (reportDetail.supportingInformation) {
    return reportDetail.supportingInformation
  }
  return localise('reports:supportingInformationNone')
}

/**
 * @param {object|undefined} exportActivity
 * @returns {object|null}
 */
function buildWasteExported(exportActivity) {
  if (!exportActivity) {
    return null
  }

  return {
    totalTonnage: exportActivity.totalTonnageReceivedForExporting,
    overseasSiteRows: buildOverseasSiteRows(exportActivity.overseasSites),
    ...formatExportTonnages(exportActivity)
  }
}

/**
 * @param {{ registration: object, accreditation: object|undefined, reportDetail: object, basePath: string, localise: (key: string, params?: object) => string, localiseUrl: (path: string) => string }} params
 * @returns {object}
 */
function buildCheckViewData({
  registration,
  accreditation,
  reportDetail,
  basePath,
  localise,
  localiseUrl,
  material,
  periodLabel,
  cadenceLabel
}) {
  const { recyclingActivity, exportActivity, wasteSent } = reportDetail
  const isExporter = isExporterRegistration(registration)
  const isReprocessor = isReprocessorRegistration(registration)

  return {
    pageTitle: localise('reports:checkPageTitle', { material, periodLabel }),
    caption: localise('reports:checkCaption'),
    heading: localise('reports:checkHeading'),
    material,
    periodLabel,
    cadenceLabel,
    registrationNumber: registration.registrationNumber,
    accreditationNumber: accreditation?.accreditationNumber,
    site: registration.site,
    isExporter,
    isReprocessor,
    isAccredited: !!accreditation,
    backUrl: localiseUrl(`${basePath}/supporting-information`),
    changeUrl: localiseUrl(`${basePath}/supporting-information`),
    createButtonText: localise('reports:checkCreateReport'),
    supportingInformation: getSupportingInformation(reportDetail, localise),
    supportingInformationLabel: localise('reports:supportingInformationLabel'),
    version: reportDetail.version,
    changeText: localise('reports:supportingInformationChange'),
    deleteUrl: localiseUrl(`${basePath}/delete`),
    wasteReceived: {
      totalTonnage: recyclingActivity.totalTonnageReceived,
      supplierDetailRows: buildSupplierDetailRows(recyclingActivity.suppliers)
    },
    wasteExported: buildWasteExported(exportActivity),
    wasteSentOn: {
      totalTonnage: getTotalTonnageSentOn(wasteSent),
      toReprocessors: wasteSent.tonnageSentToReprocessor,
      toExporters: wasteSent.tonnageSentToExporter,
      toOtherSites: wasteSent.tonnageSentToAnotherSite,
      destinationDetailRows: buildDestinationDetailRows(
        wasteSent.finalDestinations
      )
    },
    recyclingActivity: reportDetail.recyclingActivity,
    tonnageRecycledChangeUrl: localiseUrl(`${basePath}/tonnes-recycled`),
    tonnageNotRecycledChangeUrl: localiseUrl(`${basePath}/tonnes-not-recycled`),
    prn: reportDetail.prn,
    prnRevenueChangeUrl: localiseUrl(`${basePath}/prn-summary`),
    freePernChangeUrl: localiseUrl(`${basePath}/free-perns`),
    freePrnsChangeUrl: localiseUrl(`${basePath}/free-prns`)
  }
}

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

    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}`
    const material = getDisplayMaterial(registration)
    const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)
    const cadenceLabel = localise(`reports:${cadence}Heading`)

    const viewData = buildCheckViewData({
      registration,
      accreditation,
      reportDetail,
      basePath,
      localise,
      localiseUrl: request.localiseUrl.bind(request),
      material,
      periodLabel,
      cadenceLabel
    })

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
