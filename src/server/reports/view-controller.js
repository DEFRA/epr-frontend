import Boom from '@hapi/boom'
import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import {
  buildDestinationDetailRows,
  buildSupplierDetailRows,
  getTotalTonnageSentOn
} from './helpers/build-table-rows.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import {
  getNoteTypeDisplayNames,
  isExporterRegistration,
  isReprocessorRegistration
} from '#server/common/helpers/prns/registration-helpers.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { SUBMISSION_STATUS } from './constants.js'

function buildViewData({
  registration,
  accreditation,
  reportDetail,
  year,
  cadence,
  period,
  backUrl,
  localise
}) {
  const material = getDisplayMaterial(registration)
  const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)
  const { recyclingActivity, exportActivity, wasteSent } = reportDetail
  const isAccredited = !!accreditation
  const isExporter = isExporterRegistration(registration)
  const isReprocessor = isReprocessorRegistration(registration)
  const { noteTypePlural, wasteActionGerund } =
    getNoteTypeDisplayNames(registration)

  return {
    pageTitle: localise('reports:view:pageTitle'),
    heading: localise('reports:view:heading', { periodLabel }),
    backUrl,
    wasteReceivedHeading: localise('reports:wasteReceivedHeading', {
      wasteActionGerund
    }),
    noteTypeSectionHeading: localise('reports:noteTypeSectionHeading', {
      noteTypePlural
    }),
    totalIssuedTonnageLabel: localise('reports:totalIssuedTonnage', {
      noteTypePlural
    }),
    freeLabel: localise('reports:view:freeLabel', { noteTypePlural }),
    revenueLabel: localise('reports:view:totalRevenue', { noteTypePlural }),
    avgPriceLabel: localise('reports:view:avgPrice', { noteTypePlural }),

    material,
    periodLabel,
    site: registration.site?.address?.line1,

    wasteReceived: {
      totalTonnage: formatTonnage(recyclingActivity.totalTonnageReceived),
      supplierDetailRows: buildSupplierDetailRows(recyclingActivity.suppliers)
    },

    packagingWasteRecycling: {
      tonnageRecycled: formatTonnage(recyclingActivity.tonnageRecycled),
      tonnageNotRecycled: formatTonnage(recyclingActivity.tonnageNotRecycled)
    },

    wasteExported: buildWasteExported(exportActivity),

    isAccredited,
    isExporter,
    isReprocessor,

    prn: {
      issuedTonnage: reportDetail.prn?.issuedTonnage,
      freeTonnage: reportDetail.prn?.freeTonnage,
      totalRevenue: reportDetail.prn?.totalRevenue,
      averagePricePerTonne: reportDetail.prn?.averagePricePerTonne
    },

    wasteSentOn: {
      totalTonnage: formatTonnage(getTotalTonnageSentOn(wasteSent)),
      toReprocessors: formatTonnage(wasteSent.tonnageSentToReprocessor),
      toExporters: formatTonnage(wasteSent.tonnageSentToExporter),
      toOtherSites: formatTonnage(wasteSent.tonnageSentToAnotherSite),
      destinationDetailRows: buildDestinationDetailRows(
        wasteSent.finalDestinations
      )
    },

    supportingInformation:
      reportDetail.supportingInformation ||
      localise('reports:supportingInformationNone')
  }
}

function buildWasteExported(exportActivity) {
  if (!exportActivity) {
    return null
  }

  return {
    totalTonnage: formatTonnage(exportActivity.totalTonnageExported),
    overseasSiteRows: exportActivity.overseasSites.map((overseasSite) => [
      { text: overseasSite.siteName },
      { text: overseasSite.orsId }
    ]),
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
 * @satisfies {Partial<import('@hapi/hapi').ServerRoute>}
 */
export const viewGetController = {
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

    if (reportDetail.status?.currentStatus !== SUBMISSION_STATUS.SUBMITTED) {
      throw Boom.notFound()
    }

    const backUrl = request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/reports`
    )

    return h.view(
      'reports/view',
      buildViewData({
        registration,
        accreditation,
        reportDetail,
        year,
        cadence,
        period,
        backUrl,
        localise
      })
    )
  }
}
