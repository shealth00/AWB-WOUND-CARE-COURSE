import { Suspense } from "react";
import { LessonClient } from "../../../components/LessonClient";

export default function LessonPage() {
  return (
    <main className="page">
      <Suspense fallback={<div className="card">Loading lesson...</div>}>
        <LessonClient />
      </Suspense>
    </main>
  );
}
