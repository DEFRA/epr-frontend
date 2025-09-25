/* istanbul ignore file */

import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

export const homeController = {
  handler: async (request, h) => {
    try {
      const logger = createLogger()
      request.yar.clear('basic-upload')
      const endpointUrl = config.get('cdpUploader.baseUrl') + '/initiate'
      const bucket = config.get('bucket')

      const requestPayload = {
        redirect: '/upload/complete',
        s3Bucket: bucket
      }

      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      }

      // delete this log after debugging
      logger.info(['env temporary'], {
        endpointUrl,
        requestOptions: {
          ...requestOptions,
          // log parsed body instead of raw JSON string
          body: requestPayload
        }
      })

      const response = await fetch(endpointUrl, requestOptions)
      if (!response.ok) {
        const errorBody = await response.text()
        request.server.log(
          ['error', 'upload'],
          `Uploader error: ${response.status} - ${errorBody}`
        )
        throw new Error(`Failed to initiate upload: ${response.statusText}`)
      }

      const upload = await response.json()

      request.yar.set('basic-upload', {
        statusUrl: upload.statusUrl,
        uploadId: upload.uploadId
      })

      return h.view('home/index', {
        pageTitle: 'Home',
        heading: 'Home',
        action: upload.uploadUrl
      })
    } catch (err) {
      request.server.log(['error', 'upload'], err)
      return h.view('home/index', {
        pageTitle: 'Home',
        heading: 'Home',
        error: `Failed to initialize upload: ${err.message}`
      })
    }
  }
}
