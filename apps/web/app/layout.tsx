import type { Metadata } from "next";
import { ApiStatusBanner } from "../components/ApiStatusBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWB Academy",
  description: "Advance Wound Biologics training platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <ApiStatusBanner />
          <header className="site-header">
            <a className="brand" href="/">
              AWB Academy
            </a>
            <nav className="site-nav">
              <a href="/">Catalog</a>
              <a href="/library">Library</a>
              <a href="/audit-ready-documentation">Audit Tool</a>
              <a href="/debridement-documentation">Debridement Tool</a>
              <a href="/escalation-advanced-modalities">Escalation Tool</a>
              <a href="/ivr">IVR Tool</a>
              <a href="/quiz">Quiz</a>
              <a href="/forms">Forms</a>
              <a href="/completion">Completion</a>
              <a href="/lcd-updates">LCD Updates</a>
              <a href="/admin">Admin</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
