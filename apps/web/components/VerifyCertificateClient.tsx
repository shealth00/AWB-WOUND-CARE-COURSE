"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchJson } from "../src/http";

interface VerifyResponse {
  valid: boolean;
  reason?: string;
  certificate?: {
    certificate_id: string;
    user_id: string;
    learner_full_name: string;
    track: string;
    course_track: string;
    track_id: string | null;
    module_id: string;
    score: number;
    status: string;
    issued_at: string;
    completion_date: string;
    course_title: string;
    issuer_name: string;
    pdf_url: string | null;
    report_problem_url: string;
    verification_url: string;
    html_url: string;
    qr_data_url: string;
  };
}

export function VerifyCertificateClient() {
  const params = useParams<{ certificateId: string }>();
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.certificateId) {
      return;
    }

    void fetchJson<VerifyResponse>(`/verify/${params.certificateId}`)
      .then(setData)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Certificate verification failed."),
      );
  }, [params.certificateId]);

  if (error) {
    return <div className="card status-bad">{error}</div>;
  }

  if (!data) {
    return <div className="card">Verifying certificate...</div>;
  }

  if (!data.certificate) {
    return <div className="card status-bad">{data.reason ?? "Certificate is not valid."}</div>;
  }

  if (!data.valid) {
    return (
      <section className="hero">
        <div className="pill status-bad">Certificate not valid</div>
        <h1>{data.certificate.course_title}</h1>
        <p className="mono">{data.certificate.certificate_id}</p>
        <p className="muted">
          {data.certificate.learner_full_name} / {data.certificate.course_track} / status {data.certificate.status}
        </p>
        <div className="card">
          <a href={data.certificate.report_problem_url}>Report a problem</a>
        </div>
      </section>
    );
  }

  return (
    <section className="hero">
      <div className="pill status-good">Valid certificate</div>
      <h1>{data.certificate.course_title}</h1>
      <p className="mono">{data.certificate.certificate_id}</p>
      <p className="muted">
        {data.certificate.course_track} / {data.certificate.module_id} / Score {data.certificate.score}% /{" "}
        {new Date(data.certificate.completion_date).toLocaleDateString()}
      </p>
      <div className="split">
        <div className="card">
          Learner: <span className="mono">{data.certificate.learner_full_name}</span>
          <div>Issuer: {data.certificate.issuer_name}</div>
          <div>
            Verification URL:{" "}
            <a href={data.certificate.verification_url}>{data.certificate.verification_url}</a>
          </div>
          <div>
            Print-ready HTML:{" "}
            <a href={data.certificate.html_url} target="_blank" rel="noreferrer">
              Open certificate template
            </a>
          </div>
          <div>
            Report a problem:{" "}
            <a href={data.certificate.report_problem_url}>Contact support</a>
          </div>
          {data.certificate.pdf_url ? (
            <div>
              PDF URL: <a href={data.certificate.pdf_url}>Open PDF endpoint</a>
            </div>
          ) : null}
        </div>
        <div className="card" style={{ display: "grid", placeItems: "center" }}>
          <img
            alt={`QR code for ${data.certificate.certificate_id}`}
            height={160}
            src={data.certificate.qr_data_url}
            width={160}
          />
        </div>
      </div>
    </section>
  );
}
