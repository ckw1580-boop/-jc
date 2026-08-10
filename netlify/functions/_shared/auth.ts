import { getUser } from '@netlify/identity'
import type { Context } from '@netlify/functions'

import { apiError } from './http.js'

type RoleAwareUser = {
  role?: unknown
  roles?: unknown
  appMetadata?: { roles?: unknown }
  app_metadata?: { roles?: unknown }
}

export function hasAdminRole(user: unknown) {
  if (!user || typeof user !== 'object') return false

  const candidate = user as RoleAwareUser
  const roleSources = [
    candidate.roles,
    candidate.appMetadata?.roles,
    candidate.app_metadata?.roles,
  ]

  return candidate.role === 'admin'
    || roleSources.some((roles) => Array.isArray(roles) && roles.includes('admin'))
}

export async function requireAdmin(context: Context) {
  const user = await getUser()
  if (!user) {
    return { response: apiError(context, 401, 'authentication_required', '请先登录管理后台。') }
  }
  if (!hasAdminRole(user)) {
    return { response: apiError(context, 403, 'admin_required', '当前账号没有管理员权限。') }
  }
  return { user }
}

