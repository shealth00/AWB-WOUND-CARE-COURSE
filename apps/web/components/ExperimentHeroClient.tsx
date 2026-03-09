"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiUrl } from "../src/api";
import { fetchJson } from "../src/http";

interface ExperimentConfigResponse {
  experimentId: string;
  name: string;
  status: string;
  hypothesis: string;
  qa: {
    overrideParam: string;
    debugParam: string;
  };
  variants: Array<{
    id: "a" | "b";
    label: string;
    eyebrow: string;
    headline: string;
    body: string;
    bullets: string[];
    stats: Array<{
      value: string;
      label: string;
    }>;
    primaryCta: {
      id: string;
      label: string;
      href: string;
    };
    secondaryCta: {
      id: string;
      label: string;
      href: string;
    };
  }>;
}

const DEFAULT_CONFIG: ExperimentConfigResponse = {
  experimentId: "catalog-hero-v1",
  name: "Catalog Hero Messaging",
  status: "active",
  hypothesis:
    "Audit-forward versus workflow-forward homepage messaging changes catalog engagement and downstream CTA activity.",
  qa: {
    overrideParam: "abVariant",
    debugParam: "debug",
  },
  variants: [
    {
      id: "a",
      label: "Audit-forward",
      eyebrow: "Compliance-first launch path",
      headline: "Audit-ready wound-care learning with measurable progression",
      body:
        "Lead with documentation integrity, quiz gating, certificate verification, and LCD-centered readiness for providers, facilities, and commercial teams.",
      bullets: [
        "Five audience tracks with locked progression and final exams",
        "Certificate verification and completion reporting on the same domain",
        "LCD documentation workflow shared across clinic, facility, and field teams",
      ],
      stats: [
        { value: "5", label: "audience tracks" },
        { value: "90%", label: "lesson completion threshold" },
        { value: "80%", label: "exam pass mark" },
      ],
      primaryCta: {
        id: "catalog-primary",
        label: "Browse learning paths",
        href: "#catalog",
      },
      secondaryCta: {
        id: "lcd-secondary",
        label: "Review LCD updates",
        href: "/lcd-updates",
      },
    },
    {
      id: "b",
      label: "Workflow-forward",
      eyebrow: "Operations-first launch path",
      headline: "Training, intake, forms, and admin follow-through in one workflow",
      body:
        "Emphasize the end-to-end operating flow: course delivery, facility packets, intake routing, troubleshooting, and admin reporting under the same AWB Academy stack.",
      bullets: [
        "Move from catalog to certificate without leaving the platform",
        "Route facility packets, training requests, and follow-up forms through one operational layer",
        "Give admins visible diagnostics, reset controls, and experiment reporting for QA",
      ],
      stats: [
        { value: "3", label: "ops forms in platform" },
        { value: "1", label: "admin troubleshooting console" },
        { value: "24/7", label: "certificate verification" },
      ],
      primaryCta: {
        id: "catalog-primary",
        label: "Start the catalog flow",
        href: "#catalog",
      },
      secondaryCta: {
        id: "forms-secondary",
        label: "Open intake forms",
        href: "/forms",
      },
    },
  ],
};

function buildSessionKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function hashVariantIndex(seed: string, count: number) {
  let total = 0;

  for (let index = 0; index < seed.length; index += 1) {
    total = (total + seed.charCodeAt(index) * (index + 1)) % 2_147_483_647;
  }

  return total % count;
}

function sendExperimentEvent(payload: {
  experimentId: string;
  variantId: string;
  eventType: "impression" | "cta-click";
  sessionKey: string;
  path?: string;
  metadata?: Record<string, unknown>;
}) {
  const endpoint = apiUrl("/experiments/events");
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(endpoint, blob);
    return;
  }

  void fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => {
    return undefined;
  });
}

export function ExperimentHeroClient() {
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<ExperimentConfigResponse>(DEFAULT_CONFIG);
  const [sessionKey, setSessionKey] = useState("");
  const [variantId, setVariantId] = useState<"a" | "b">("a");
  const [configWarning, setConfigWarning] = useState<string | null>(null);
  const debugEnabled = searchParams.get("debug") === "1";
  const variantOverride = searchParams.get("abVariant");

  useEffect(() => {
    void fetchJson<ExperimentConfigResponse>("/experiments/catalog-hero/config")
      .then((payload) => {
        setConfig(payload);
      })
      .catch((reason: unknown) => {
        setConfigWarning(
          reason instanceof Error ? reason.message : "Experiment config fallback in use.",
        );
      });
  }, []);

  useEffect(() => {
    const sessionStorageKey = "awb:session-key";
    const variantStorageKey = `awb:experiment:${config.experimentId}:variant`;
    const savedSessionKey = window.localStorage.getItem(sessionStorageKey);
    const nextSessionKey = savedSessionKey || buildSessionKey();
    if (!savedSessionKey) {
      window.localStorage.setItem(sessionStorageKey, nextSessionKey);
    }

    const allowedVariantIds = new Set<"a" | "b">(config.variants.map((variant) => variant.id));
    const normalizeVariantId = (value?: string | null): "a" | "b" | null => {
      if (!value) {
        return null;
      }
      const candidate = value.toLowerCase();
      return candidate === "a" || candidate === "b" ? candidate : null;
    };
    const overrideCandidate = normalizeVariantId(variantOverride);
    const savedVariant = window.localStorage.getItem(variantStorageKey);

    let nextVariantId: "a" | "b";
    if (overrideCandidate && allowedVariantIds.has(overrideCandidate)) {
      nextVariantId = overrideCandidate;
    } else if (savedVariant && allowedVariantIds.has(savedVariant as "a" | "b")) {
      nextVariantId = savedVariant as "a" | "b";
    } else {
      nextVariantId = config.variants[hashVariantIndex(nextSessionKey, config.variants.length)]?.id ?? "a";
      window.localStorage.setItem(variantStorageKey, nextVariantId);
    }

    setSessionKey(nextSessionKey);
    setVariantId(nextVariantId);
  }, [config, variantOverride]);

  useEffect(() => {
    if (!sessionKey || !variantId) {
      return;
    }

    const impressionKey = `awb:experiment:${config.experimentId}:${variantId}:${sessionKey}:impression`;

    if (window.sessionStorage.getItem(impressionKey)) {
      return;
    }

    window.sessionStorage.setItem(impressionKey, "1");
    sendExperimentEvent({
      experimentId: config.experimentId,
      variantId,
      eventType: "impression",
      sessionKey,
      path: window.location.pathname + window.location.search,
      metadata: {
        source: "homepage-hero",
      },
    });
  }, [config.experimentId, sessionKey, variantId]);

  const activeVariant =
    config.variants.find((variant) => variant.id === variantId) ?? DEFAULT_CONFIG.variants[0];

  function handleCtaClick(cta: { id: string; href: string; label: string }) {
    if (!sessionKey) {
      return;
    }

    sendExperimentEvent({
      experimentId: config.experimentId,
      variantId: activeVariant.id,
      eventType: "cta-click",
      sessionKey,
      path: window.location.pathname + window.location.search,
      metadata: {
        ctaId: cta.id,
        ctaLabel: cta.label,
        href: cta.href,
      },
    });
  }

  return (
    <section className="hero hero-shell">
      <div className="hero-copy">
        <p className="hero-eyebrow">AWB Academy</p>
        <div className="pill" style={{ width: "fit-content" }}>
          {activeVariant.eyebrow}
        </div>
        <h1 style={{ fontSize: "clamp(2.6rem, 7vw, 4.9rem)", margin: "12px 0 16px" }}>
          {activeVariant.headline}
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--muted)", maxWidth: 760 }}>
          {activeVariant.body}
        </p>
        <div className="actions">
          <a
            className="button"
            href={activeVariant.primaryCta.href}
            onClick={() => handleCtaClick(activeVariant.primaryCta)}
          >
            {activeVariant.primaryCta.label}
          </a>
          <a
            className="button secondary"
            href={activeVariant.secondaryCta.href}
            onClick={() => handleCtaClick(activeVariant.secondaryCta)}
          >
            {activeVariant.secondaryCta.label}
          </a>
        </div>
      </div>
      <div className="hero-side">
        <div className="question">
          <strong>Variant {activeVariant.id.toUpperCase()} / {activeVariant.label}</strong>
          <div className="muted" style={{ marginTop: 8 }}>
            {config.hypothesis}
          </div>
        </div>
        <div className="stack">
          {activeVariant.bullets.map((bullet) => (
            <div className="question" key={bullet}>
              {bullet}
            </div>
          ))}
        </div>
        <div className="hero-stats">
          {activeVariant.stats.map((stat) => (
            <div className="hero-stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
        {debugEnabled ? (
          <div className="hero-debug">
            <strong>Experiment debug</strong>
            <div className="mono">experiment: {config.experimentId}</div>
            <div className="mono">variant: {activeVariant.id}</div>
            <div className="mono">session: {sessionKey || "pending"}</div>
            <div className="mono">override: {variantOverride ?? "none"}</div>
            {configWarning ? <div className="status-warn">{configWarning}</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
