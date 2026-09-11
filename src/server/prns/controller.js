import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { mapToSelectOptions } from '#server/common/helpers/waste-organisations/map-to-select-options.js'
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { journeyMetrics } from '#server/common/helpers/metrics/index.js'
import { fetchDecemberPrnEligibility } from './helpers/fetch-december-prn-eligibility.js'
import { resolveDecemberWasteControl } from './helpers/resolve-december-waste-choice.js'
import { resolveInsufficientBalanceMessageKey } from './helpers/insufficient-balance-error.js'
import { buildCreatePrnViewData } from './view-data.js'

/**
 * Build error data for insufficient balance redirect. `pool` is `'december'`
 * when the discarded draft over-spent its December pool - see
 * discardDraftOverBalance in view-controller.js, the only writer of the
 * `pool` query param.
 * @param {(key: string) => string} localise
 * @param {string} decemberWasteControlMode
 * @param {string} [pool]
 * @returns {{errors: object, errorSummary: {title: string, list: Array}}}
 */
function buildInsufficientBalanceError(
  localise,
  decemberWasteControlMode,
  pool
) {
  const messageKey = resolveInsufficientBalanceMessageKey(
    decemberWasteControlMode,
    pool === 'december'
  )
  const message = localise(messageKey)
  return {
    errors: {},
    errorSummary: {
      title: localise('prns:errorSummaryTitle'),
      list: [{ text: message, href: '#tonnage' }]
    }
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const controller = {
  /**
   * @param {HapiRequest & { params: PrnListParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, registrationId, accreditationId } = request.params
    const session = request.auth.credentials

    const { registration } = await getRequiredRegistrationWithAccreditation({
      organisationId,
      registrationId,
      backendToken: session.backendToken,
      accreditationId
    })

    const [{ organisations }, wasteBalance, decemberPrnEligibility] =
      await Promise.all([
        request.wasteOrganisationsService.getOrganisations(),
        getWasteBalance(
          organisationId,
          accreditationId,
          session.backendToken,
          request.logger
        ),
        fetchDecemberPrnEligibility(
          organisationId,
          registrationId,
          accreditationId,
          session.backendToken
        )
      ])

    const { noteTypePlural } = getNoteTypeDisplayNames(registration)
    const decemberWasteControl = resolveDecemberWasteControl(
      decemberPrnEligibility,
      request.t,
      noteTypePlural,
      wasteBalance
    )

    const viewData = buildCreatePrnViewData(request, {
      organisationId,
      recipients: mapToSelectOptions(organisations),
      registration,
      registrationId,
      wasteBalance,
      decemberWasteControl
    })

    await journeyMetrics.start(request, JOURNEY.createPrn, accreditationId)

    // Check for insufficient balance error from redirect
    const { t: localise } = request
    const errorParam = request.query.error

    if (errorParam === 'insufficient_balance') {
      const { errors, errorSummary } = buildInsufficientBalanceError(
        localise,
        decemberWasteControl.mode,
        /** @type {string | undefined} */ (request.query.pool)
      )
      return h.view('prns/create', { ...viewData, errors, errorSummary })
    }

    return h.view('prns/create', viewData)
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PrnListParams } from './helpers/session-types.js'
 */
