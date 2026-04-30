import { createFreeTonnageControllers } from '../helpers/create-free-tonnage-controllers.js'
import { buildExporterViewData } from './exporter-page-guards.js'

const { getController, postController } = createFreeTonnageControllers({
  guardFn: buildExporterViewData
})

export {
  getController as exporterFreePernGetController,
  postController as exporterFreePernPostController
}
