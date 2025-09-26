import { initUpload } from './init-upload.js'
import fetch from 'node-fetch'

jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    json: jest.fn()
  })
}))

describe('initUpload', () => {
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
