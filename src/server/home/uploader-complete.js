import { config } from '~/src/config/config.js'

export const uploadCompleteController = {
  options: {},
  handler: async (request, h) => {
    try {
      const uploadId = request.query.uploadId
      if (!uploadId) {
        request.server.log(['error', 'upload'], 'No upload ID provided')
        return h.redirect('/')
      }

      const baseUrl = config.get('cdpUploader.baseUrl')
      const statusUrl = `${baseUrl}/status/${uploadId}`

      request.server.log(
        ['info', 'upload'],
        `Checking status URL: ${statusUrl}`
      )

      const response = await fetch(statusUrl)
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`)
      }

      const status = await response.json()

      if (status.uploadStatus === 'ready') {
        return h.view('home/uploading-complete', {
          pageTitle: 'Upload Complete',
          heading: 'Upload Complete',
          status,
          refresh: false
        })
      }

      return h.view('home/uploading-complete', {
        pageTitle: 'Processing Upload',
        heading: 'Processing Your File',
        status,
        refresh: true
      })
    } catch (err) {
      request.server.log(['error', 'upload'], err)
      return h.redirect('/?error=upload-failed')
    }
  }
}
