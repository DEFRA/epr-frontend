import fs from 'fs'
import path from 'path'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '../common/helpers/aws-s3-client.js'
import { config } from '../../config/config.js'

/**
 * Upload controller for POST /upload
 * @satisfies {Partial<import('@hapi/hapi').ServerRoute>}
 */
export const uploadController = {
  options: {
    payload: {
      output: 'file',
      parse: true,
      multipart: true,
      maxBytes: 100 * 1024 * 1024 // 100MB
    }
  },

  async handler(request, h) {
    try {
      const file = request.payload?.file
      if (!file?.path) {
        return h.view('home/index', {
          pageTitle: 'Home',
          heading: 'Home',
          error: 'No file uploaded'
        })
      }

      const filename =
        file.hapi?.filename || file.filename || path.basename(file.path)

      const stream = fs.createReadStream(file.path)

      const params = {
        Bucket: 're-ex-summary-logs',
        Key: filename,
        Body: stream
      }

      await s3Client.send(new PutObjectCommand(params))

      request.server.log(
        ['upload', 's3'],
        `Uploaded to s3://${params.Bucket}/${params.Key}`
      )

      return h.view('home/index', {
        pageTitle: 'Home',
        heading: 'Home',
        success: `File "${filename}" uploaded successfully`
      })
    } catch (err) {
      request.server.log(['error', 'upload'], err)
      request.server.log(['BUCKETERROR', 'upload'], config.get('s3.bucket'))
      return h.view('home/index', {
        pageTitle: 'Home',
        heading: 'Home',
        error: `Upload failed: ${err.message}`
      })
    }
  }
}
