"use client";

import { useState } from "react";
import { fetchJson } from "../src/http";
import { setMemberToken } from "../src/memberAuth";

interface RegisterResponse {
  registered: boolean;
  token?: string;
  member: {
    memberId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    membershipStatus: string;
  };
}

export function MemberRegisterClient() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const payload = await fetchJson<RegisterResponse>("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
        }),
      });

      if (payload.token) {
        setMemberToken(payload.token);
      }
      setNotice("Account created. Redirecting to catalog...");
      window.location.href = "/#catalog";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h1>Create your member account</h1>
      <p className="muted">Register to access the AWB Academy lesson library.</p>
      <form className="stack" onSubmit={handleRegister}>
        <div className="split">
          <label className="field">
            First name
            <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </label>
          <label className="field">
            Last name
            <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </label>
        </div>
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
            placeholder="Minimum 8 characters"
          />
        </label>
        <button className="button" disabled={loading} type="submit">
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
      {notice ? <div className="status-good" style={{ marginTop: 12 }}>{notice}</div> : null}
      {error ? <div className="status-bad" style={{ marginTop: 12 }}>{error}</div> : null}
      <div className="muted" style={{ marginTop: 16 }}>
        Already have an account? <a href="/login">Sign in</a>.
      </div>
    </div>
  );
}
