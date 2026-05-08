import { createPrnSummaryControllers } from '../helpers/create-prn-summary-controllers.js'
import { buildExporterViewData } from './exporter-page-guards.js'

const { getController, postController } = createPrnSummaryControllers({
  guardFn: buildExporterViewData,
  getBackUrl: ({ reportsListPath }) => reportsListPath,
  nextPage: 'free-perns'
})

export {
  getController as exporterPrnSummaryGetController,
  postController as exporterPrnSummaryPostController
}
