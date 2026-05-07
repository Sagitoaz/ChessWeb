import "dotenv/config";

const requiredVars = ["MONGODB_URI", "MONGODB_DB_NAME"] as const;

const parseCorsOrigins = (value: string | undefined): string[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const configuredCorsOrigins = parseCorsOrigins(
  process.env.CORS_ORIGINS || process.env.FRONTEND_URL,
);
const normalizeSameSite = (
  value: string | undefined,
): "lax" | "strict" | "none" => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "strict") return "strict";
  if (normalized === "none") return "none";
  return "lax";
};

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri: process.env.MONGODB_URI as string,
  mongodbDbName: process.env.MONGODB_DB_NAME as string,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "change-me-access-secret",
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET || "change-me-refresh-secret",
  stockfishBinaryPath:
    process.env.STOCKFISH_BINARY_PATH || "/usr/bin/stockfish",
  stockfishLogEnabled:
    (process.env.STOCKFISH_LOG_ENABLED || "false").toLowerCase() === "true",
  stockfishLogFile: process.env.STOCKFISH_LOG_FILE || "./stockfish_engine.log",
  stockfishTimeoutMs: Number(process.env.STOCKFISH_TIMEOUT_MS || 5000),
  groqApiKey: (process.env.GROQ_API_KEY || "").trim(),
  groqModel: (process.env.GROQ_MODEL || "mixtral-8x7b-32768").trim(),
  groqEnabled: (process.env.GROQ_API_KEY || "").trim().length > 0,
  googleClientId: (process.env.GOOGLE_CLIENT_ID || "").trim() || null,
  authRefreshCookieName:
    (process.env.AUTH_REFRESH_COOKIE_NAME || "chessweb_rt").trim() ||
    "chessweb_rt",
  authRefreshCookieDomain:
    (process.env.AUTH_REFRESH_COOKIE_DOMAIN || "").trim() || null,
  authRefreshCookiePath:
    (process.env.AUTH_REFRESH_COOKIE_PATH || "/api/v1/auth").trim() ||
    "/api/v1/auth",
  authRefreshCookieSecure:
    (process.env.AUTH_REFRESH_COOKIE_SECURE ||
      (process.env.NODE_ENV === "production" ? "true" : "false")
    ).toLowerCase() === "true",
  authRefreshCookiePartitioned:
    (process.env.AUTH_REFRESH_COOKIE_PARTITIONED ||
      (process.env.NODE_ENV === "production" ? "true" : "false")
    ).toLowerCase() === "true",
  authRefreshCookieSameSite: normalizeSameSite(
    process.env.AUTH_REFRESH_COOKIE_SAMESITE ||
      (process.env.NODE_ENV === "production" ? "none" : "lax"),
  ),
  authRefreshCookieMaxAgeMs: Math.max(
    60_000,
    Number(
      process.env.AUTH_REFRESH_COOKIE_MAX_AGE_MS ||
        30 * 24 * 60 * 60 * 1000,
    ) || 30 * 24 * 60 * 60 * 1000,
  ),
  port: Number(process.env.PORT || 8080),
  corsOrigins:
    configuredCorsOrigins.length > 0
      ? configuredCorsOrigins
      : [
          "http://localhost:5173",
          "http://localhost:5174",
          "http://127.0.0.1:5173",
          "http://127.0.0.1:5174",
        ],
};
