import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { apiEnv } from "../env.js";

const s3Client = new S3Client({
  region: apiEnv.AWS_REGION,
});

export function hasPdfStorageBucket(): boolean {
  return typeof apiEnv.CERTIFICATE_PDF_S3_BUCKET === "string" && apiEnv.CERTIFICATE_PDF_S3_BUCKET.length > 0;
}

export async function uploadCertificatePdf(input: {
  certificateId: string;
  pdfBuffer: Buffer;
}): Promise<string | null> {
  if (!hasPdfStorageBucket()) {
    return null;
  }

  const bucket = apiEnv.CERTIFICATE_PDF_S3_BUCKET as string;
  const key = `certificates/${input.certificateId}.pdf`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: input.pdfBuffer,
      ContentType: "application/pdf",
    }),
  );

  return `s3://${bucket}/${key}`;
}
