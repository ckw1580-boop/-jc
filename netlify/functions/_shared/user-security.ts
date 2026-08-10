import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

export const USER_SESSION_COOKIE = 's7_user_session'
export const USER_SESSION_SECONDS = 7 * 24 * 60 * 60
export const USER_ID_PATTERN = /^[a-z0-9_-]{4,32}$/
export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 128

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SCRYPT_KEY_LENGTH = 64
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const SESSION_TOKEN_BYTES = 32

export function normalizeUserId(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function validateUserId(value: unknown) {
  const userId = normalizeUserId(value)
  return USER_ID_PATTERN.test(userId)
    ? undefined
    : '用户ID须为 4–32 位小写字母、数字、下划线或短横线。'
}

export function validateEmail(value: unknown) {
  const email = normalizeEmail(value)
  return email.length <= 254 && EMAIL_PATTERN.test(email)
    ? undefined
    : '请输入有效的邮箱地址。'
}

export function validatePassword(value: unknown, label = '密码') {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    return `${label}长度须为 ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} 个字符。`
  }
  return undefined
}

export function validateRegistration(body: unknown) {
  const input = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const userId = normalizeUserId(input.userId)
  const email = normalizeEmail(input.email)
  const password = typeof input.password === 'string' ? input.password : ''
  const errors: Record<string, string> = {}

  const userIdError = validateUserId(userId)
  const emailError = validateEmail(email)
  const passwordError = validatePassword(password)
  if (userIdError) errors.userId = userIdError
  if (emailError) errors.email = emailError
  if (passwordError) errors.password = passwordError

  return Object.keys(errors).length ? { errors } : { data: { userId, email, password }, errors }
}

export function validateLogin(body: unknown) {
  const input = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const userId = normalizeUserId(input.userId)
  const password = typeof input.password === 'string' ? input.password : ''
  const errors: Record<string, string> = {}
  const userIdError = validateUserId(userId)
  if (userIdError) errors.userId = userIdError
  if (!password) errors.password = '请输入密码。'
  return Object.keys(errors).length ? { errors } : { data: { userId, password }, errors }
}

export function validatePasswordChange(body: unknown) {
  const input = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const currentPassword = typeof input.currentPassword === 'string' ? input.currentPassword : ''
  const newPassword = typeof input.newPassword === 'string' ? input.newPassword : ''
  const errors: Record<string, string> = {}
  if (!currentPassword) errors.currentPassword = '请输入当前密码。'
  const newPasswordError = validatePassword(newPassword, '新密码')
  if (newPasswordError) errors.newPassword = newPasswordError
  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.newPassword = '新密码不能与当前密码相同。'
  }
  return Object.keys(errors).length
    ? { errors }
    : { data: { currentPassword, newPassword }, errors }
}

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const derived = await deriveKey(password, salt)
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, n, r, p, saltValue, hashValue] = encoded.split('$')
  if (algorithm !== 'scrypt' || !n || !r || !p || !saltValue || !hashValue) return false
  if (Number(n) !== SCRYPT_OPTIONS.N || Number(r) !== SCRYPT_OPTIONS.r || Number(p) !== SCRYPT_OPTIONS.p) return false

  try {
    const expected = Buffer.from(hashValue, 'base64url')
    const actual = await deriveKey(password, Buffer.from(saltValue, 'base64url'))
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

export function createSessionToken() {
  return randomBytes(SESSION_TOKEN_BYTES).toString('base64url')
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function sessionExpiresAt(now = Date.now()) {
  return new Date(now + USER_SESSION_SECONDS * 1000).toISOString()
}

export function readCookie(request: Request, name = USER_SESSION_COOKIE) {
  const cookie = request.headers.get('cookie') || ''
  for (const part of cookie.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    if (part.slice(0, separator).trim() === name) return decodeURIComponent(part.slice(separator + 1).trim())
  }
  return ''
}

export function serializeSessionCookie(token: string, request: Request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${USER_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${USER_SESSION_SECONDS}${secure}`
}

export function clearSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${USER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}
