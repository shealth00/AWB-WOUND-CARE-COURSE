import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  APP_ENV: z.string().default("development"),
  BASE_URL: z.string().url().default("https://www.advancewoundbiologic.com"),
  ADMIN_API_KEY: z.string().min(8).default("development-admin-key"),
  ADMIN_LOGIN_EMAIL: z.string().email().default("admin@advancewoundbiologic.com"),
  ADMIN_LOGIN_PASSWORD: z.string().min(8).default("change-me-now"),
  ADMIN_SESSION_TTL_SEC: z.coerce.number().int().positive().default(43200),
  NIGHTLY_SYNC_CRON: z.string().default("0 2 * * *"),
  SMARTSHEET_ACCESS_TOKEN: z.string().min(1),
  SMARTSHEET_INTEGRATION_SOURCE: z.string().default("APPLICATION,AWB,Academy"),
  DATABASE_URL: z.string().min(1),
  SMARTSHEET_SHEETID_CATALOG: z.string().min(1),
  SMARTSHEET_SHEETID_QUESTIONBANK: z.string().min(1),
  SMARTSHEET_SHEETID_RESULTS: z.string().min(1),
  SMARTSHEET_SHEETID_FORMS: z.string().min(1),
  SMARTSHEET_SHEETID_IVR: z.string().min(1),
  SMARTSHEET_WEBHOOK_CALLBACK_URL: z.string().url().optional(),
  SMARTSHEET_WEBHOOK_SCOPE: z.enum(["sheet", "workspace", "plan"]).default("sheet"),
  SMARTSHEET_WEBHOOK_SCOPE_OBJECT_ID: z.string().min(1).optional(),
  SMARTSHEET_WEBHOOK_NAME: z.string().default("AWB Academy Sync"),
  SMARTSHEET_WEBHOOK_EVENTS: z.string().default("*.*"),
  CERTIFICATE_ISSUER_NAME: z.string().default("Advance Wound Biologic"),
  CERTIFICATE_ISSUER_LOGO_URL: z.string().url().default("https://www.advancewoundbiologic.com/logo.png"),
  CERTIFICATE_INSTRUCTOR_NAME: z.string().default("AWB Faculty"),
  CERTIFICATE_CREDIT_HOURS_DEFAULT: z.string().default("See track syllabus"),
  CERTIFICATE_SUPPORT_EMAIL: z.string().email().default("support@advancewoundbiologic.com"),
  CERTIFICATE_PDF_TOKEN: z.string().min(8).default("development-pdf-token"),
  CERTIFICATE_WKHTMLTOPDF_BIN: z.string().default("wkhtmltopdf"),
  AWS_REGION: z.string().default("us-east-1"),
  CERTIFICATE_PDF_S3_BUCKET: z.string().optional(),
  VERIFY_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  VERIFY_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
});

export const apiEnv = envSchema.parse(process.env);
