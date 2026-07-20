import Boom from '@hapi/boom'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { SUBMISSION_STATUS } from './constants.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabelWithComma } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
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
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber
    } = request.params
    const session = request.auth.credentials
    const { t: localise } = request

    const reportsUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports`

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
        submissionNumber,
        session.idToken
      )
    ])

    if (
      reportDetail.status?.currentStatus !== SUBMISSION_STATUS.READY_TO_SUBMIT
    ) {
      throw Boom.notFound()
    }

    const material = getDisplayMaterial(registration)
    const periodLabel = formatPeriodLabelWithComma(
      { year, period },
      cadence,
      localise
    )

    // A resubmission draft keeps the period in its Requires resubmission state,
    // so the panel shows that rather than the draft report's own Ready to submit
    // status. isResubmission bundles the flag, so the page behaves as the
    // standard flow until closed-period adjustments ship.
    const statusValue = isResubmission(submissionNumber)
      ? localise('reports:createdStatusValueResubmission')
      : localise('reports:createdStatusValue')

    const homeUrl = `/organisations/${organisationId}`
    const viewDraftUrl = `${reportsUrl}/${year}/${cadence}/${period}/submissions/${submissionNumber}/view`

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
      registrationNumber: registration.registrationNumber,
      materialLabel: localise('reports:createdMaterialLabel'),
      material,
      siteLabel: localise('reports:siteLabel'),
      site: registration.site,
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
