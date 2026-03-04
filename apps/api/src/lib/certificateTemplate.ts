import { PROGRAM_TRACKS } from "@awb/lms-core/program";
import { apiEnv } from "../env.js";

export interface CertificateHtmlInput {
  learnerFullName: string;
  courseTrack: string;
  courseTitle: string;
  completionDate: string;
  creditHours: string;
  certificateId: string;
  verificationUrl: string;
  issuerName: string;
  issuerLogoUrl: string;
  instructorName: string;
  qrCodeImageUrl: string;
}

const CERTIFICATE_TEMPLATE = String.raw`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Advance Wound Biologic - Certificate of Completion</title>
  <style>
    @page { size: Letter landscape; margin: 0.5in; }
    body { font-family: Arial, sans-serif; color: #111; }
    .wrap { border: 10px solid #111; padding: 36px; height: 7.5in; box-sizing: border-box; position: relative; }
    .top { display: flex; justify-content: space-between; align-items: center; }
    .logo { height: 60px; }
    .title { text-align: center; margin-top: 18px; }
    .title h1 { margin: 0; font-size: 44px; letter-spacing: 1px; }
    .title h2 { margin: 10px 0 0; font-size: 18px; font-weight: 600; }
    .name { text-align: center; margin-top: 34px; font-size: 38px; font-weight: 700; }
    .body { text-align: center; margin-top: 18px; font-size: 16px; line-height: 1.6; }
    .meta { display: flex; justify-content: space-between; margin-top: 34px; font-size: 14px; }
    .meta .block { width: 32%; }
    .fine { position: absolute; bottom: 18px; left: 36px; right: 36px; font-size: 11px; opacity: 0.85; display:flex; justify-content:space-between; align-items:flex-end; }
    .qr { height: 90px; width: 90px; object-fit: contain; border: 1px solid #111; padding: 6px; }
    .badge { display:inline-block; padding: 6px 10px; border:1px solid #111; font-size:12px; margin-top:10px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <img class="logo" src="{{issuer_logo_url}}" alt="Advance Wound Biologic Logo" />
      <div style="text-align:right; font-size:12px;">
        <div><strong>Certificate ID:</strong> {{certificate_id}}</div>
        <div><strong>Verify:</strong> https://www.advancewoundbiologic.com/verify/{{certificate_id}}</div>
      </div>
    </div>

    <div class="title">
      <h1>Certificate of Completion</h1>
      <h2>AWB Academy - {{course_title}} ({{course_track}} Track)</h2>
      <div class="badge">Issued by Advance Wound Biologic</div>
    </div>

    <div class="name">{{learner_full_name}}</div>

    <div class="body">
      has successfully completed the online course requirements on <strong>{{completion_date}}</strong>.<br/>
      This certificate confirms course completion and mastery of required assessments.
    </div>

    <div class="meta">
      <div class="block">
        <strong>Issuer</strong><br/>Advance Wound Biologic
      </div>
      <div class="block" style="text-align:center;">
        <strong>Total Hours</strong><br/>{{credit_hours}}
      </div>
      <div class="block" style="text-align:right;">
        <strong>Instructor</strong><br/>{{instructor_name}}
      </div>
    </div>

    <div class="fine">
      <div>
        Verification is available at advancewoundbiologic.com. Do not accept screenshots as proof of completion.
      </div>
      <img class="qr" src="{{qr_code_image_url}}" alt="QR Code"/>
    </div>
  </div>
</body>
</html>
`;

export function buildCertificateHtml(input: CertificateHtmlInput): string {
  const replacements = {
    learner_full_name: escapeHtml(input.learnerFullName),
    course_track: escapeHtml(input.courseTrack),
    course_title: escapeHtml(input.courseTitle),
    completion_date: escapeHtml(input.completionDate),
    credit_hours: escapeHtml(input.creditHours),
    certificate_id: escapeHtml(input.certificateId),
    verification_url: escapeHtml(input.verificationUrl),
    issuer_name: escapeHtml(input.issuerName),
    issuer_logo_url: escapeHtml(input.issuerLogoUrl),
    instructor_name: escapeHtml(input.instructorName),
    qr_code_image_url: escapeHtml(input.qrCodeImageUrl),
  };

  return Object.entries(replacements).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    CERTIFICATE_TEMPLATE,
  );
}

export function resolveCertificateTemplateDefaults(trackId: string | null, courseTrack: string) {
  const trackMeta = PROGRAM_TRACKS.find((track) => track.id === trackId) ?? null;

  return {
    issuerName: apiEnv.CERTIFICATE_ISSUER_NAME,
    issuerLogoUrl: apiEnv.CERTIFICATE_ISSUER_LOGO_URL,
    instructorName: apiEnv.CERTIFICATE_INSTRUCTOR_NAME,
    creditHours: trackMeta?.estimatedHours ?? apiEnv.CERTIFICATE_CREDIT_HOURS_DEFAULT,
    courseTrack: trackMeta?.title.replace(/\s+Track$/, "") ?? courseTrack,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
