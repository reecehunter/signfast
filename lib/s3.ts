import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const bucket = process.env.AWS_S3_BUCKET as string
const region = process.env.AWS_REGION as string
const accessKeyId = process.env.AWS_ACCESS_KEY_ID as string
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY as string

if (!bucket || !region) {
  console.warn('AWS S3 is not fully configured. Set AWS_S3_BUCKET and AWS_REGION.')
}

export const s3 = new S3Client({
  region,
  credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
})

export async function uploadToS3(params: {
  key: string
  contentType: string
  body: Buffer | Uint8Array | string
  cacheControl?: string
  acl?: 'private' | 'public-read'
}): Promise<{ key: string; url: string }> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
    CacheControl: params.cacheControl,
    ACL: params.acl,
  })
  await s3.send(command)

  const cdnBase = process.env.ASSET_BASE_URL // e.g., https://cdn.example.com
  const url = cdnBase
    ? `${cdnBase.replace(/\/$/, '')}/${params.key}`
    : `https://s3.${region}.amazonaws.com/${bucket}/${params.key}`

  return { key: params.key, url }
}

export async function getS3PresignedUrl(key: string, expiresInSeconds = 60): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds })
}

export async function downloadFromS3(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  const response = await s3.send(command)
  const chunks: Uint8Array[] = []

  if (response.Body) {
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
  }

  return Buffer.concat(chunks)
}

export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  await s3.send(command)
}

export function extractS3KeyFromUrl(url: string): string | null {
  // Extract S3 key from various URL formats
  const patterns = [
    // https://s3.region.amazonaws.com/bucket/key
    /https:\/\/s3\.[^\/]+\.amazonaws\.com\/[^\/]+\/(.+)/,
    // https://bucket.s3.region.amazonaws.com/key
    /https:\/\/[^\/]+\.s3\.[^\/]+\.amazonaws\.com\/(.+)/,
    // CDN URLs
    /https:\/\/[^\/]+\/(.+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}
