import Joi from 'joi'

import { createDataPageControllers } from '../helpers/create-data-page-controllers.js'
import { getRedirectUrl } from '../helpers/redirect.js'
import { updateReport } from '../helpers/update-report.js'
import { buildExporterViewData } from './exporter-page-guards.js'

const FORMAT_ERROR = 'reports:prnSummaryErrorFormat'

const payloadSchema = Joi.object({
  prnRevenue: Joi.number().min(0).required().messages({
    'any.required': 'reports:prnSummaryErrorRequired',
    'number.base': 'reports:prnSummaryErrorRequired',
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
    pageTitle: localise('reports:prnSummaryPageTitle', {
      material,
      periodLabel
    }),
    caption: localise('reports:prnSummaryCaption'),
    heading: localise('reports:prnSummaryHeading', { material, periodLabel }),
    tonnageLabel: localise('reports:prnSummaryTonnageLabel'),
    tonnageIssued: reportDetail.prn.issuedTonnage,
    revenueLabel: localise('reports:prnSummaryRevenueLabel'),
    continueText: localise('reports:prnSummaryContinue'),
    saveText: localise('reports:prnSummarySave'),
    backUrl: periodPath,
    defaultValue: reportDetail.prn.totalRevenue
  })
}

/**
 * @param {Request} request
 * @param {object} [options]
 */
async function buildViewData(request, options = {}) {
  return buildExporterViewData(
    request,
    (ctx) => {
      const fields = pageFields(ctx)(request.t)
      fields.backUrl = request.localiseUrl(fields.backUrl)
      return fields
    },
    options
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
      getRedirectUrl(request, request.params, action, 'free-perns')
    )
  }
})

export {
  getController as prnSummaryGetController,
  postController as prnSummaryPostController
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 */
