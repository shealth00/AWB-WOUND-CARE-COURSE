"use client";

import { useState } from "react";
import { fetchJson } from "../src/http";
import { setMemberToken } from "../src/memberAuth";

interface LoginResponse {
  token: string;
  expiresInSec: number;
  member: {
    memberId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    membershipStatus: string;
  };
}

export function MemberLoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const payload = await fetchJson<LoginResponse>("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      setMemberToken(payload.token);
      setNotice("Logged in successfully. Redirecting to catalog...");
      window.location.href = "/#catalog";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h1>Member login</h1>
      <p className="muted">Access training, lessons, and quizzes with your AWB Academy account.</p>
      <form className="stack" onSubmit={handleLogin}>
        <label className="field">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
          />
        </label>
        <label className="field">
          Password
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </label>
        <button className="button" disabled={loading} type="submit">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {notice ? <div className="status-good" style={{ marginTop: 12 }}>{notice}</div> : null}
      {error ? <div className="status-bad" style={{ marginTop: 12 }}>{error}</div> : null}
      <div className="muted" style={{ marginTop: 16 }}>
        Need an account? <a href="/register">Create one</a>.
      </div>
    </div>
  );
}
