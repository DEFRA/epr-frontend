import { S3Client } from '@aws-sdk/client-s3'
import { config } from '../../../config/config.js'

const s3Config = config.get('s3')

export const s3Client = new S3Client({
  region: s3Config.region,
  endpoint: s3Config.endpoint,
  credentials: {
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey
  },
  forcePathStyle: s3Config.forcePathStyle
})
