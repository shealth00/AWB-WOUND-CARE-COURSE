import { Suspense } from "react";
import { CatalogClient } from "../components/CatalogClient";
import { ExperimentHeroClient } from "../components/ExperimentHeroClient";

export default function HomePage() {
  return (
    <main className="page">
      <Suspense
        fallback={
          <section className="hero">
            <p className="hero-eyebrow">AWB Academy</p>
            <h1 style={{ fontSize: "clamp(2.6rem, 7vw, 4.9rem)", margin: "12px 0 16px" }}>
              Wound-care training, quizzes, intake, and operations in one flow
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--muted)", maxWidth: 760 }}>
              The platform combines course delivery, forms intake, progress tracking, and certificate verification under one API-backed workflow.
            </p>
          </section>
        }
      >
        <ExperimentHeroClient />
      </Suspense>
      <section id="catalog" style={{ marginTop: 24 }}>
        <CatalogClient />
      </section>
    </main>
  );
}
