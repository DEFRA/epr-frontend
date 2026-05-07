import { createFreeTonnageControllers } from '../helpers/create-free-tonnage-controllers.js'
import { buildReprocessorViewData } from './reprocessor-page-guards.js'

const { getController, postController } = createFreeTonnageControllers({
  guardFn: buildReprocessorViewData
})

export {
  getController as reprocessorFreePrnsGetController,
  postController as reprocessorFreePrnsPostController
}
