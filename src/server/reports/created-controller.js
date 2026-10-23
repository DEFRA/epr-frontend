import Boom from '@hapi/boom'

import { fetchRegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { organisationNumber as toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { siteNameOf } from '#server/common/helpers/organisations/site-name.js'
import { isExporterRegistration } from '#server/common/helpers/prns/registration-helpers.js'
import { year as toYear } from '#server/common/helpers/year.js'
import { homePath } from '#server/organisations/home-page.js'
import { SUBMISSION_STATUS } from './constants.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { reportPath, reportsListPath } from './helpers/report-paths.js'
import { isResubmission } from './helpers/resubmission.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const createdController = {
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
      organisationNumber,
      registrationNumber,
      year,
      cadence,
      period,
      submissionNumber
    } = request.params
    const session = request.auth.credentials
    const { t: localise } = request

    const reportsUrl = reportsListPath(request.params)

    const { registration, accreditation } =
      await fetchRegistrationWithAccreditation(
        { organisationNumber, registrationNumber, year },
        session.backendToken
      )
    const reportDetail = await fetchReportDetail(
      request.params,
      session.backendToken
    )

    if (reportDetail.status !== SUBMISSION_STATUS.READY_TO_SUBMIT) {
      throw Boom.notFound()
    }

    const material = getMaterialDisplayName(registration.material)
    const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)

    // A resubmission draft keeps the period in its Requires resubmission state,
    // so the panel shows that rather than the draft report's own Ready to submit
    // status. isResubmission bundles the flag, so the page behaves as the
    // standard flow until closed-period adjustments ship.
    const statusValue = isResubmission(submissionNumber)
      ? localise('reports:createdStatusValueResubmission')
      : localise('reports:createdStatusValue')

    const homeUrl = homePath(toOrganisationNumber(organisationNumber), {
      year: toYear(year),
      exporting: isExporterRegistration(registration)
    })
    const viewDraftUrl = `${reportPath(request.params)}/view`

    return h.view('reports/created', {
      pageTitle: localise('reports:createdPageTitle', {
        material,
        periodLabel
      }),
      heading: localise('reports:createdHeading', { periodLabel }),
      statusLabel: localise('reports:createdStatusLabel'),
      statusValue,
      detailsHeading: localise('reports:detailsHeading'),
      isAccredited: !!accreditation,
      accreditationLabel: localise('reports:accreditationLabel'),
      accreditationNumber: accreditation?.accreditationNumber,
      registrationLabel: localise('reports:createdRegistrationLabel'),
      registrationNumber,
      materialLabel: localise('reports:createdMaterialLabel'),
      material,
      siteLabel: localise('reports:siteLabel'),
      site: siteNameOf(registration),
      nextStepsHeading: localise('reports:createdNextStepsHeading'),
      nextStepsGuidance: localise('reports:createdNextStepsGuidance'),
      selfSubmitGuidance: localise('reports:createdSelfSubmitGuidance'),
      goToReportsButton: {
        text: localise('reports:createdGoToReports'),
        href: request.localiseUrl(reportsUrl)
      },
      viewDraftReportLink: {
        text: localise('reports:createdViewDraftReport'),
        href: request.localiseUrl(viewDraftUrl)
      },
      returnHomeLink: {
        text: localise('reports:createdReturnHome'),
        href: request.localiseUrl(homeUrl)
      }
    })
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 */
