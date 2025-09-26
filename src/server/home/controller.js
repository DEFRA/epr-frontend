/* istanbul ignore file */

import { config } from '~/src/config/config.js'

export const homeController = {
  handler: async (request, h) => {
    try {
      request.yar.clear('basic-upload')
      const endpointUrl = config.get('cdpUploader.baseUrl') + '/initiate'

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect: '/upload/complete',
          s3Bucket: config.get('bucket')
        })
      })

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
