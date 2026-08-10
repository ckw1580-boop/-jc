import type { Handler } from '@netlify/functions'

const handler: Handler = async (event) => {
  const payload = JSON.parse(event.body || '{}') as {
    user?: {
      email?: string
      app_metadata?: Record<string, unknown>
      user_metadata?: Record<string, unknown>
    }
  }
  const user = payload.user || {}
  // Identity event functions use the legacy Lambda handler runtime, where
  // environment variables are exposed through Node's process.env.
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || 'wck-tlss'
  const isAdmin = Boolean(adminEmail && user.email?.toLowerCase() === adminEmail)

  return {
    statusCode: 200,
    body: JSON.stringify({
      app_metadata: {
        ...user.app_metadata,
        roles: isAdmin ? ['admin'] : [],
      },
      user_metadata: {
        ...user.user_metadata,
        ...(isAdmin ? { full_name: displayName } : {}),
      },
    }),
  }
}

export { handler }
