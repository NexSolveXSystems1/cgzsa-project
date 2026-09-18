import type { Config } from "drizzle-kit";
import "dotenv/config";

export default {
  schema: "./cgzsa-backend/src/db/schema.ts",
  out: "./cgzsa-backend/drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
