import { CatalogClient } from "../components/CatalogClient";

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
      </section>
      <section style={{ marginTop: 24 }}>
        <CatalogClient />
      </section>
    </main>
  );
}
