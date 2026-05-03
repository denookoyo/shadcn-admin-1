function required(key) {
  return String(process.env[key] || '').trim()
}

export function assertRuntimeEnv() {
  const missing = []
  if (!required('POSTGRES_PRISMA_URL')) missing.push('POSTGRES_PRISMA_URL')

  const isProduction = process.env.NODE_ENV === 'production'
  if (isProduction) {
    const jwtSecret = required('JWT_SECRET') || required('NEXTAUTH_SECRET')
    if (!jwtSecret || jwtSecret === 'devsecret') missing.push('JWT_SECRET')
    if (!required('VITE_GOOGLE_CLIENT_ID') && !required('GOOGLE_CLIENT_ID')) missing.push('GOOGLE_CLIENT_ID')
  }

  if (missing.length > 0) {
    throw new Error(`Missing required runtime env vars: ${missing.join(', ')}`)
  }
}
