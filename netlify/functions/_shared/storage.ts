import { createHash, randomBytes } from 'node:crypto'

import { getDeployStore, getStore } from '@netlify/blobs'
import { getDatabase } from '@netlify/database'
import type { Context } from '@netlify/functions'

export function database() {
  return getDatabase()
}

export function imageStore(context: Context) {
  if (context.deploy.context === 'production') {
    return getStore({ name: 'feedback-images', consistency: 'strong' })
  }
  return getDeployStore({ name: 'feedback-images' })
}

export function createUploadToken() {
  return randomBytes(32).toString('base64url')
}

export function hashUploadToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function readBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
}
