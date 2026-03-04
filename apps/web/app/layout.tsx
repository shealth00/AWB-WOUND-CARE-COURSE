import type { Metadata } from "next";
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
          <header className="site-header">
            <a className="brand" href="/">
              AWB Academy
            </a>
            <nav className="site-nav">
              <a href="/">Catalog</a>
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
