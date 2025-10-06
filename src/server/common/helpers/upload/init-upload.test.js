import fetch from 'node-fetch'
import { describe, expect, test, vi } from 'vitest'
import { initUpload } from './init-upload.js'

vi.mock(import('node-fetch'), () => ({
  default: vi.fn().mockResolvedValue({
    json: vi.fn()
  })
}))

describe(initUpload, () => {
  test('should call fetch', async () => {
    await initUpload()

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/initiate$/),
      expect.objectContaining({
        body: JSON.stringify({})
      })
    )
  })

  test('should call fetch with options', async () => {
    const options = {
      redirect: 'redirect',
      callback: 'callback',
      s3Bucket: 's3Bucket',
      s3Path: 's3Path',
      mimeTypes: ['mimeType'],
      maxFileSize: 'maxFileSize',
      metadata: { key: 'value' }
    }
    await initUpload(options)

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/initiate$/),
      expect.objectContaining({
        body: JSON.stringify(options)
      })
    )
  })
})
