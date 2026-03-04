import { Suspense } from "react";
import { VerifyCertificateClient } from "../../../components/VerifyCertificateClient";

export default function VerifyCertificatePage() {
  return (
    <main className="page">
      <Suspense fallback={<div className="card">Verifying certificate...</div>}>
        <VerifyCertificateClient />
      </Suspense>
    </main>
  );
}
