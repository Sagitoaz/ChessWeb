import 'dotenv/config'

const requiredVars = ['MONGODB_URI', 'MONGODB_DB_NAME'] as const

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`[env] Missing required environment variable: ${key}`)
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI as string,
  mongodbDbName: process.env.MONGODB_DB_NAME as string,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'change-me-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret',
  port: Number(process.env.PORT || 8080),
}
