import { periodParamsSchema } from './helpers/period-params-schema.js'
import { deleteReport } from './helpers/delete-report.js'
import { reportPath, reportsListPath } from './helpers/report-paths.js'
import { STALE_REASON } from './helpers/stale.js'
import { fetchRegistrationAndAccreditationByNumber } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'

/**
 * Resolves the translation-key prefix for the given stale reasons. Both
 * reasons present gets its own combined-copy page rather than picking a
 * winner between the two, since the report is genuinely invalidated by both
 * causes at once.
 * @param {string[]} reasons
 * @returns {'reportInvalidated' | 'prnCancelled' | 'summaryLogChanged'}
 */
const translationKeyPrefixFor = (reasons) => {
  const hasSummaryLogChanged = reasons.includes(
    STALE_REASON.SUMMARY_LOG_CHANGED
  )
  const hasPrnCancelled = reasons.includes(STALE_REASON.PRN_CANCELLED)

  if (hasSummaryLogChanged && hasPrnCancelled) {
    return 'reportInvalidated'
  }
  if (hasPrnCancelled) {
    return 'prnCancelled'
  }
  return 'summaryLogChanged'
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest & { params: PeriodParams }>>} */
export const reportStaleErrorGetController = {
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
    const { t: localise } = request
    const { organisationNumber, registrationNumber } = request.params
    const session = request.auth.credentials

    const reportsUrl = request.localiseUrl(reportsListPath(request.params))

    const periodBase = reportPath(request.params)

    const context =
      /** @type {{ periodPath: string, reasons: string[] } | undefined} */ (
        request.yar.get('reportStaleErrorContext')
      )
    if (context?.periodPath !== periodBase) {
      return h.redirect(reportsUrl)
    }

    // The context is left in place so a refresh re-renders the error rather than
    // ejecting the operator to their reports; a later staleness redirect for the
    // same period overwrites it.
    const prefix = translationKeyPrefixFor(context.reasons)

    const { registration } = await fetchRegistrationAndAccreditationByNumber(
      organisationNumber,
      registrationNumber,
      session
    )
    const { noteType } = getNoteTypeDisplayNames(registration)

    return h.view('reports/report-stale-error', {
      pageTitle: localise(`reports:${prefix}PageTitle`, { noteType }),
      heading: localise(`reports:${prefix}Heading`, { noteType }),
      bodyLine1: localise(`reports:${prefix}BodyLine1`, { noteType }),
      bodyLine2: localise(`reports:${prefix}BodyLine2`, { noteType }),
      returnToReportsUrl: reportsUrl
    })
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest & { params: PeriodParams }>>} */
export const reportStaleErrorPostController = {
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
    const session = request.auth.credentials

    await deleteReport(request.params, session.backendToken)

    return h.redirect(request.localiseUrl(reportsListPath(request.params)))
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 */
