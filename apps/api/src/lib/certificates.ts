import QRCode from "qrcode";
import { PROGRAM_TRACKS } from "@awb/lms-core/program";
import { apiEnv } from "../env.js";

export async function buildCertificatePresentation(input: {
  certificateId: string;
  learnerFullName: string;
  trackId: string | null;
  track: string;
  moduleId: string;
  userId: string;
  score: number;
  status: string;
  issuedAt: string;
  completionDate: string;
  courseTitle: string | null;
  issuerName?: string;
  pdfUrl?: string | null;
  reportProblemUrl?: string;
}) {
  const verificationUrl = `${apiEnv.BASE_URL.replace(/\/$/, "")}/verify/${encodeURIComponent(input.certificateId)}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    width: 160,
    margin: 1,
  });
  const trackMeta = PROGRAM_TRACKS.find((track) => track.id === input.trackId) ?? null;

  return {
    valid: input.status === "valid",
    certificate: {
      certificate_id: input.certificateId,
      user_id: input.userId,
      learner_full_name: input.learnerFullName,
      track: input.track,
      course_track: trackMeta?.title ?? input.track,
      track_id: input.trackId,
      module_id: input.moduleId,
      score: input.score,
      status: input.status,
      issued_at: input.issuedAt,
      completion_date: input.completionDate,
      course_title: input.courseTitle ?? trackMeta?.certificateTitle ?? input.track,
      issuer_name: input.issuerName ?? apiEnv.CERTIFICATE_ISSUER_NAME,
      pdf_url: input.pdfUrl ?? null,
      report_problem_url:
        input.reportProblemUrl ??
        `mailto:${apiEnv.CERTIFICATE_SUPPORT_EMAIL}?subject=${encodeURIComponent(`Certificate issue: ${input.certificateId}`)}`,
      verification_url: verificationUrl,
      html_url: `${apiEnv.BASE_URL.replace(/\/$/, "")}/api/certificates/${encodeURIComponent(input.certificateId)}/html`,
      qr_data_url: qrDataUrl,
    },
  };
}
