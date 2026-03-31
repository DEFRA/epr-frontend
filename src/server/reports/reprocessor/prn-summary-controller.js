import Joi from 'joi'

import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { updateReport } from '../helpers/update-report.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const FORMAT_ERROR = 'reports:reprocessorPrnSummaryErrorFormat'

const payloadSchema = Joi.object({
  prnRevenue: Joi.number().min(0).required().messages({
    'any.required': 'reports:reprocessorPrnSummaryErrorRequired',
    'number.base': 'reports:reprocessorPrnSummaryErrorRequired',
    'number.min': FORMAT_ERROR,
    'number.unsafe': FORMAT_ERROR,
    'number.infinity': FORMAT_ERROR
  }),
  action: Joi.string().valid('continue', 'save').required(),
  crumb: Joi.string()
})

const VIEW_PATH = 'reports/prn-summary'

/**
 * @param {{ material: string, periodLabel: string, periodPath: string, reportDetail: object }} ctx
 */
function pageFields({ material, periodLabel, periodPath, reportDetail }) {
  return (localise) => ({
    pageTitle: localise('reports:reprocessorPrnSummaryPageTitle', {
      material,
      periodLabel
    }),
    caption: localise('reports:reprocessorPrnSummaryCaption'),
    heading: localise('reports:reprocessorPrnSummaryHeading', {
      material,
      periodLabel
    }),
    tonnageLabel: localise('reports:reprocessorPrnSummaryTonnageLabel'),
    tonnageIssued: reportDetail.prn.issuedTonnage,
    revenueLabel: localise('reports:reprocessorPrnSummaryRevenueLabel'),
    continueText: localise('reports:reprocessorPrnSummaryContinue'),
    saveText: localise('reports:reprocessorPrnSummarySave'),
    backUrl: `${periodPath}/tonnes-not-recycled`,
    defaultValue: reportDetail.prn.totalRevenue
  })
}

/**
 * @param {Request} request
 * @param {object} [options]
 */
async function buildViewData(request, options = {}) {
  return buildReprocessorViewData(
    request,
    (ctx) => {
      const fields = pageFields(ctx)(request.t)
      fields.backUrl = request.localiseUrl(fields.backUrl)
      return fields
    },
    { ...options, accreditedOnly: true }
  )
}

const { getController, postController } = createDataPageControllers({
  viewPath: VIEW_PATH,
  fieldName: 'prnRevenue',
  payloadSchema,
  buildViewData,
  async postHandler(request, h) {
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const { prnRevenue, action } = request.payload
    const session = request.auth.credentials

    await updateReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      { prnRevenue },
      session.idToken
    )

    return h.redirect(
      getRedirectUrl(request, request.params, action, 'free-prns')
    )
  }
})

export {
  getController as reprocessorPrnSummaryGetController,
  postController as reprocessorPrnSummaryPostController
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 */
