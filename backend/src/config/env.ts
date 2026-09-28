export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
