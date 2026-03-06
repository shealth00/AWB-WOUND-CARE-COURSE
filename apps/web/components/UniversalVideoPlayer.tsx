"use client";

interface UniversalVideoPlayerProps {
  src: string;
  mimeType?: string | null;
  title?: string;
}

export function UniversalVideoPlayer({ src, mimeType, title }: UniversalVideoPlayerProps) {
  const normalizedMimeType =
    typeof mimeType === "string" && mimeType.trim().length > 0 ? mimeType.trim() : "video/mp4";

  return (
    <video controls playsInline preload="metadata" style={{ borderRadius: 12, width: "100%" }}>
      <source src={src} type={normalizedMimeType} />
      <source src={src} type="video/mp4" />
      Your browser does not support embedded video playback.
      {title ? ` Open ${title} in a new tab.` : ""}
    </video>
  );
}
