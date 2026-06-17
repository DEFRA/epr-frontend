import { getDraft, saveDraft } from './draft.js'
import { buildErrorView, joiErrorList } from './errors.js'
import { PATHS } from './journey.js'

/**
 * @typedef {object} Step
 * @property {string} path
 * @property {string} template
 * @property {string} title
 * @property {import('joi').ObjectSchema} schema
 * @property {string} back
 * @property {string} next
 * @property {Record<string, string>} [anchors]
 * @property {(values: Record<string, any>, errors: Record<string, { text: string }>) => Record<string, any>} [viewModel]
 * @property {(payload: Record<string, any>, draft: Record<string, any>) => { field: string, message: string }[]} [check]
 * @property {(payload: Record<string, any>, draft: Record<string, any>) => Record<string, any>} collect
 */

const isFromCheck = (request) => request.query.from === 'check'

/**
 * Builds the view context for a step, including the back link and form action,
 * which both depend on whether the user arrived from the check-your-answers
 * page (so they are returned there after editing).
 *
 * @param {Step} step
 * @param {import('@hapi/hapi').Request} request
 * @param {Record<string, any>} values
 * @param {import('./errors.js').RenderableErrors} [errorView]
 */
const buildView = (step, request, values, errorView) => ({
  pageTitle: step.title,
  heading: step.title,
  formAction: isFromCheck(request) ? `${step.path}?from=check` : step.path,
  backUrl: isFromCheck(request) ? PATHS.check : step.back,
  values,
  ...(step.viewModel ? step.viewModel(values, errorView?.errors ?? {}) : {}),
  errors: errorView?.errors ?? {},
  errorSummary: errorView?.errorSummary
})

/**
 * Creates the GET and POST routes for a journey step. The GET renders the form
 * pre-filled from the draft; the POST validates (field-level via Joi, then any
 * cross-field check), saves to the draft and moves on.
 *
 * @param {Step} step
 * @returns {import('@hapi/hapi').ServerRoute[]}
 */
export const createStepRoutes = (step) => {
  const reRender = (request, h, issues) => {
    const errorView = buildErrorView(issues, step.anchors)
    const values = { ...getDraft(request), ...request.payload }
    return h.view(step.template, buildView(step, request, values, errorView)).takeover()
  }

  return [
    {
      method: 'GET',
      path: step.path,
      options: { auth: false },
      handler: (request, h) =>
        h.view(step.template, buildView(step, request, getDraft(request)))
    },
    {
      method: 'POST',
      path: step.path,
      options: {
        auth: false,
        validate: {
          payload: step.schema,
          options: { abortEarly: false, convert: true },
          failAction: (request, h, err) =>
            reRender(
              request,
              h,
              joiErrorList(/** @type {import('joi').ValidationError} */ (err))
            )
        }
      },
      handler: (request, h) => {
        const draft = getDraft(request)
        const issues = step.check ? step.check(request.payload, draft) : []
        if (issues.length > 0) {
          return reRender(request, h, issues)
        }
        saveDraft(request, { ...draft, ...step.collect(request.payload, draft) })
        return h.redirect(isFromCheck(request) ? PATHS.check : step.next)
      }
    }
  ]
}
