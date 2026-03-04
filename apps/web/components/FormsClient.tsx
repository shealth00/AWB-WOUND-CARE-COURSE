"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../src/api";

interface SubmitResponse {
  submissionId: string;
  status: string;
  smartsheetSynced: boolean;
}

interface ProgramCatalogResponse {
  toolLibrary: Array<{
    id: string;
    title: string;
    summary: string;
    downloadUrl: string;
    formRoute: string;
  }>;
  documentationPack: {
    title: string;
    summary: string;
    fieldGroups: Array<{
      id: string;
      title: string;
      fields: string[];
    }>;
  };
}

export function FormsClient() {
  const [submissionType, setSubmissionType] = useState("Facility Escalation Packet");
  const [siteType, setSiteType] = useState("SNF");
  const [facilityName, setFacilityName] = useState("");
  const [caseId, setCaseId] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [program, setProgram] = useState<ProgramCatalogResponse | null>(null);

  useEffect(() => {
    void fetch(apiUrl("/program/catalog"))
      .then((response) => response.json() as Promise<ProgramCatalogResponse>)
      .then(setProgram)
      .catch(() => undefined);
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(apiUrl("/forms/submit"), {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as SubmitResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error ?? "Form submission failed." : "Form submission failed.");
      }

      setResult(payload as SubmitResponse);
      event.currentTarget.reset();
      setFacilityName("");
      setCaseId("");
      setNotes("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Form submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid">
      <section className="hero">
        <div className="pill">No PHI</div>
        <h1>Operational forms</h1>
        <p className="muted">
          Facility Escalation Packet and Post-op Protocol submissions write to Smartsheet and keep
          uploaded files attached to the row.
        </p>
        <div className="actions">
          <a className="button secondary" href="/downloads/awb-wound-documentation-pack.pdf">
            Download AWB Documentation Pack
          </a>
        </div>
      </section>

      {program ? (
        <section className="split">
          <div className="card">
            <h2>Documentation pack fields</h2>
            <div className="stack">
              {program.documentationPack.fieldGroups.map((group) => (
                <div className="question" key={group.id}>
                  <strong>{group.title}</strong>
                  <div className="muted">{group.fields.join(" / ")}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2>Track tools</h2>
            <div className="stack">
              {program.toolLibrary.map((tool) => (
                <div className="question" key={tool.id}>
                  <strong>{tool.title}</strong>
                  <div className="muted">{tool.summary}</div>
                  <a href={tool.downloadUrl}>Download</a>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <form className="card" onSubmit={onSubmit}>
        <div className="split">
          <label className="field">
            Submission type
            <select name="submissionType" onChange={(event) => setSubmissionType(event.target.value)} value={submissionType}>
              <option>Facility Escalation Packet</option>
              <option>Post-op Protocol</option>
              <option>Weekly Wound Rounds Checklist</option>
              <option>Pressure Injury Prevention Bundle</option>
              <option>Post-Op Graft Care Protocol</option>
            </select>
          </label>
          <label className="field">
            Site type
            <select name="siteType" onChange={(event) => setSiteType(event.target.value)} value={siteType}>
              <option>SNF</option>
              <option>NH</option>
              <option>ALF</option>
              <option>Adult Senior Care</option>
              <option>ASC</option>
              <option>Clinic</option>
              <option>Ortho</option>
            </select>
          </label>
          <label className="field">
            Facility name
            <input name="facilityName" onChange={(event) => setFacilityName(event.target.value)} value={facilityName} />
          </label>
          <label className="field">
            Case ID
            <input name="caseId" onChange={(event) => setCaseId(event.target.value)} value={caseId} />
          </label>
        </div>
        <label className="field">
          Notes
          <textarea name="notes" onChange={(event) => setNotes(event.target.value)} rows={5} value={notes} />
        </label>
        <label className="field">
          Attachments
          <input multiple name="attachments" type="file" />
        </label>
        <div className="actions">
          <button className="button" disabled={submitting} type="submit">
            {submitting ? "Submitting..." : "Submit form"}
          </button>
        </div>
      </form>

      {result ? (
        <div className="card status-good">
          Submitted {result.submissionId} with status {result.status}.
          {!result.smartsheetSynced ? " Local save succeeded but Smartsheet sync failed." : ""}
        </div>
      ) : null}
      {error ? <div className="card status-bad">{error}</div> : null}
    </div>
  );
}
