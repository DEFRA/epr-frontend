import fetch from 'node-fetch'

import { config } from '~/src/config/config.js'

async function initUpload(options = {}) {
  const {
    redirect,
    callback,
    s3Bucket,
    s3Path,
    mimeTypes,
    maxFileSize,
    metadata
  } = options

  const cdpUploaderUrl = config.get('cdpUploader.url')
  const response = await fetch(`${cdpUploaderUrl}/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirect,
      callback,
      s3Bucket,
      s3Path,
      mimeTypes,
      maxFileSize,
      metadata
    })
  })

  // @todo: handle response errors
  return response.json()
}

export { initUpload }
