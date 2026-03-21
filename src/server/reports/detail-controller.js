import Joi from 'joi'

import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime } from '#server/common/helpers/format-time.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { isExporterRegistration } from '#server/common/helpers/prns/registration-helpers.js'
import { CADENCE } from './constants.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'

/**
 * Build govukTable rows for supplier details.
 * @param {Array<{supplierName: string, role: string, tonnage: number}>} suppliers
 * @returns {Array<Array<{text: string | number}>>}
 */
function buildSupplierRows(suppliers) {
  return suppliers.map((supplier) => [
    { text: supplier.supplierName },
    { text: supplier.role },
    { text: supplier.tonnage }
  ])
}

/**
 * Build govukTable rows for destination details.
 * @param {Array<{recipientName: string, role: string, tonnage: number}>} destinations
 * @returns {Array<Array<{text: string | number}>>}
 */
function buildDestinationRows(destinations) {
  return destinations.map((destination) => [
    { text: destination.recipientName },
    { text: destination.role },
    { text: destination.tonnage }
  ])
}

/**
 * Build govukTable rows for overseas reprocessing sites.
 * @param {Array<{siteName: string, osrId: string}>} overseasSites
 * @returns {Array<Array<{text: string}>>}
 */
function buildOverseasSiteRows(overseasSites) {
  return overseasSites.map((overseasSite) => [
    { text: overseasSite.siteName },
    { text: overseasSite.osrId }
  ])
}

const MIN_YEAR = 2024
const MAX_YEAR = 2100
const MAX_PERIOD = 12

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const detailController = {
  options: {
    validate: {
      params: Joi.object({
        organisationId: Joi.string().required(),
        registrationId: Joi.string().required(),
        year: Joi.number().integer().min(MIN_YEAR).max(MAX_YEAR).required(),
        cadence: Joi.string()
          .valid(CADENCE.MONTHLY, CADENCE.QUARTERLY)
          .required(),
        period: Joi.number().integer().min(1).max(MAX_PERIOD).required()
      })
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

    const { wasteReceived, wasteExported, wasteSentOn } = reportDetail.sections
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
        totalTonnage: wasteReceived.totalTonnage,
        supplierRows: buildSupplierRows(wasteReceived.suppliers)
      },
      wasteExported: wasteExported
        ? {
            totalTonnage: wasteExported.totalTonnage,
            overseasSiteRows: buildOverseasSiteRows(wasteExported.overseasSites)
          }
        : null,
      wasteSentOn: {
        totalTonnage: wasteSentOn.totalTonnage,
        toReprocessors: wasteSentOn.toReprocessors,
        toExporters: wasteSentOn.toExporters,
        toOtherSites: wasteSentOn.toOtherSites,
        destinationRows: buildDestinationRows(wasteSentOn.destinations)
      }
    }

    return h.view('reports/detail', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
