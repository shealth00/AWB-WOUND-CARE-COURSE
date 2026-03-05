import { spawn } from "node:child_process";
import { apiEnv } from "../env.js";
import { verifyAdminToken } from "./auth.js";

export async function renderPdfFromHtml(html: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(apiEnv.CERTIFICATE_WKHTMLTOPDF_BIN, ["--quiet", "-", "-"]);
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      errors.push(chunk);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
        return;
      }

      reject(new Error(Buffer.concat(errors).toString("utf8") || `wkhtmltopdf exited with code ${code}`));
    });

    child.stdin.end(html);
  });
}

export function canAccessCertificatePdf(authHeader: string | undefined, token: string | undefined): boolean {
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, "");
  return (
    token === apiEnv.CERTIFICATE_PDF_TOKEN ||
    bearerToken === apiEnv.ADMIN_API_KEY ||
    Boolean(bearerToken && verifyAdminToken(bearerToken))
  );
}
