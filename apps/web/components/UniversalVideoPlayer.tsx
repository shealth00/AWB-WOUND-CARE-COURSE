"use client";

import { useEffect, useRef } from "react";

interface UniversalVideoPlayerProps {
  src: string;
  mimeType?: string | null;
  title?: string;
  storageKey?: string | null;
  resumeWindowDays?: number;
}

export function UniversalVideoPlayer({
  src,
  mimeType,
  title,
  storageKey,
  resumeWindowDays = 30,
}: UniversalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const normalizedMimeType =
    typeof mimeType === "string" && mimeType.trim().length > 0 ? mimeType.trim() : "video/mp4";
  const persistedKey = storageKey ? `awb:video-progress:${storageKey}` : null;

  useEffect(() => {
    if (!persistedKey || !videoRef.current) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(persistedKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as { position: number; updatedAt: number };
      const maxAgeMs = resumeWindowDays * 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.updatedAt > maxAgeMs) {
        window.localStorage.removeItem(persistedKey);
        return;
      }
      if (typeof parsed.position === "number" && parsed.position > 1) {
        videoRef.current.currentTime = parsed.position;
      }
    } catch {
      window.localStorage.removeItem(persistedKey);
    }
  }, [persistedKey, resumeWindowDays, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !persistedKey) {
      return;
    }

    let lastRecorded = 0;

    const recordProgress = () => {
      if (!video.duration || Number.isNaN(video.duration)) {
        return;
      }
      if (Math.abs(video.currentTime - lastRecorded) < 2) {
        return;
      }
      lastRecorded = video.currentTime;
      window.localStorage.setItem(
        persistedKey,
        JSON.stringify({ position: video.currentTime, updatedAt: Date.now() }),
      );
    };

    video.addEventListener("timeupdate", recordProgress);
    video.addEventListener("pause", recordProgress);

    return () => {
      video.removeEventListener("timeupdate", recordProgress);
      video.removeEventListener("pause", recordProgress);
    };
  }, [persistedKey, src]);

  return (
    <video ref={videoRef} controls playsInline preload="metadata" style={{ borderRadius: 12, width: "100%" }}>
      <source src={src} type={normalizedMimeType} />
      <source src={src} type="video/mp4" />
      Your browser does not support embedded video playback.
      {title ? ` Open ${title} in a new tab.` : ""}
    </video>
  );
}
