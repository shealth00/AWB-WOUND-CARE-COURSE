import { Suspense } from "react";
import { QuizClient } from "../../components/QuizClient";

export default function QuizPage() {
  return (
    <main className="page">
      <Suspense fallback={<div className="card">Loading quiz...</div>}>
        <QuizClient />
      </Suspense>
    </main>
  );
}
