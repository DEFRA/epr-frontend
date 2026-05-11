import { createPrnSummaryControllers } from '../helpers/create-prn-summary-controllers.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const { getController, postController } = createPrnSummaryControllers({
  guardFn: buildReprocessorViewData,
  getBackUrl: ({ periodPath }) => `${periodPath}/tonnes-not-recycled`,
  nextPage: 'free-prns'
})

export {
  getController as reprocessorPrnSummaryGetController,
  postController as reprocessorPrnSummaryPostController
}
