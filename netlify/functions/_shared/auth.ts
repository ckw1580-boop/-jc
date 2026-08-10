import { getUser } from '@netlify/identity'
import type { Context } from '@netlify/functions'

import { apiError } from './http.js'

export async function requireAdmin(context: Context) {
  const user = await getUser()
  if (!user) {
    return { response: apiError(context, 401, 'authentication_required', '请先登录管理后台。') }
  }
  if (user.role !== 'admin' && !user.roles?.includes('admin')) {
    return { response: apiError(context, 403, 'admin_required', '当前账号没有管理员权限。') }
  }
  return { user }
}

