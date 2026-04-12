import "dotenv/config";

const requiredVars = ["MONGODB_URI", "MONGODB_DB_NAME"] as const;

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
  port: Number(process.env.PORT || 8080),
};
