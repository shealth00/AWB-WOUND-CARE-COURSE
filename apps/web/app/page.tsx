import { CatalogClient } from "../components/CatalogClient";
import { webEnv } from "../src/env";

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <p
          style={{
            margin: 0,
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--accent)",
          }}
        >
          AWB Academy
        </p>
        <h1 style={{ fontSize: "clamp(2.4rem, 7vw, 4.5rem)", margin: "12px 0 16px" }}>
          Wound-care training, quizzes, intake, and operations in one flow
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--muted)", maxWidth: 760 }}>
          The web app consumes the API-backed catalog, quiz engine, forms intake, completion
          tracking, and certificate verification endpoints. Smartsheet remains the operational
          system of record for content and workflow.
        </p>
        <div className="split" style={{ marginTop: 24 }}>
          <Card label="API Base URL" value={webEnv.apiBaseUrl} />
          <Card label="Environment" value={webEnv.appEnv} />
        </div>
      </section>
      <section style={{ marginTop: 24 }}>
        <CatalogClient />
      </section>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 18,
        background: "#fcf7ef",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {label}
      </div>
      <div style={{ marginTop: 8, fontSize: 20 }}>{value}</div>
    </div>
  );
}
