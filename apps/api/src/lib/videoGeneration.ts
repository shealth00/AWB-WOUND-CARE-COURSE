import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PollyClient, SynthesizeSpeechCommand, type VoiceId } from "@aws-sdk/client-polly";
import { apiEnv } from "../env.js";

type PollyEngine = "standard" | "neural" | "long-form" | "generative";
type TtsProvider = "aws-polly" | "openai-tts";
type GenerationStage = "processing" | "rendering";
type SlideLayout = "title" | "bullets" | "callout" | "outro";

export interface StructuredSlideInput {
  id?: string;
  layout?: SlideLayout;
  title: string;
  bullets?: string[];
  callout?: string | null;
  narration: string;
}

export interface LessonVideoGenerationInput {
  jobId: string;
  lessonTitle: string;
  moduleTitle: string;
  track: string;
  owner: string;
  script?: string | null;
  slides?: StructuredSlideInput[] | null;
  ttsProvider?: TtsProvider;
  voiceId?: string;
  voiceEngine?: PollyEngine;
  openAiModel?: string;
  render?: {
    width?: number;
    height?: number;
    fps?: number;
  };
  brand?: {
    logoUrl?: string | null;
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
  };
  onStage?: (stage: GenerationStage) => Promise<void> | void;
}

export interface LessonVideoGenerationOutput {
  jobId: string;
  outputPath: string;
  outputFileName: string;
  workDir: string;
  warnings: string[];
}

interface SlideSpec {
  id: string;
  layout: SlideLayout;
  title: string;
  bullets: string[];
  callout: string | null;
  narration: string;
}

const runtimeDir = __dirname;
const repoRoot = path.resolve(runtimeDir, "..", "..", "..", "..");
const webAppDir = path.join(repoRoot, "apps", "web");
const jobsRoot = path.join(webAppDir, "remotion-jobs");
const generatedPublicRoot = path.join(webAppDir, "public", "generated");

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_FPS = 30;
const REMOTION_CLI_PACKAGE = "@remotion/cli@4.0.366";

const DEFAULT_BRAND = {
  logoUrl: null as string | null,
  primaryColor: "#0F3D75",
  accentColor: "#2E89FF",
  fontFamily: "Inter, Arial, Helvetica, sans-serif",
};

export async function generateLessonVideo(
  input: LessonVideoGenerationInput,
): Promise<LessonVideoGenerationOutput> {
  await ensurePrerequisites();
  await input.onStage?.("processing");

  const render = {
    width: input.render?.width ?? DEFAULT_WIDTH,
    height: input.render?.height ?? DEFAULT_HEIGHT,
    fps: input.render?.fps ?? DEFAULT_FPS,
  };
  const brand = {
    logoUrl: input.brand?.logoUrl ?? DEFAULT_BRAND.logoUrl,
    primaryColor: input.brand?.primaryColor ?? DEFAULT_BRAND.primaryColor,
    accentColor: input.brand?.accentColor ?? DEFAULT_BRAND.accentColor,
    fontFamily: input.brand?.fontFamily ?? DEFAULT_BRAND.fontFamily,
  };

  const jobDir = path.join(jobsRoot, input.jobId);
  const publicAudioDir = path.join(generatedPublicRoot, input.jobId);
  const audioRelativePath = path.posix.join("generated", input.jobId, "narration.mp3");
  const narrationPath = path.join(publicAudioDir, "narration.mp3");
  const normalizedNarrationPath = path.join(publicAudioDir, "narration-normalized.m4a");
  const noAudioOutputPath = path.join(jobDir, `${input.jobId}-video.mp4`);
  const finalOutputPath = path.join(jobDir, `${input.jobId}-final.mp4`);
  const warnings: string[] = [];

  await fs.rm(jobDir, { recursive: true, force: true });
  await fs.rm(publicAudioDir, { recursive: true, force: true });
  await fs.mkdir(jobDir, { recursive: true });
  await fs.mkdir(publicAudioDir, { recursive: true });

  const slides = resolveSlides(input.slides, input.script, input.lessonTitle);
  if (slides.length === 0) {
    throw new Error("No renderable slide content found in generation payload.");
  }

  const narrationText = slides.map((slide) => slide.narration).join("\n\n").trim();
  if (!narrationText) {
    throw new Error("No narration text found for speech synthesis.");
  }

  await synthesizeNarration({
    provider: input.ttsProvider ?? "aws-polly",
    text: narrationText,
    voiceId: input.voiceId ?? apiEnv.VIDEO_GENERATION_DEFAULT_VOICE,
    engine: input.voiceEngine ?? "neural",
    model: input.openAiModel ?? apiEnv.VIDEO_GENERATION_OPENAI_MODEL,
    outputPath: narrationPath,
  });

  const durationSeconds = await probeDurationSeconds(narrationPath);
  if (!durationSeconds || durationSeconds <= 0) {
    throw new Error("Unable to determine narration duration.");
  }

  const timing = buildTiming(slides, durationSeconds, render.fps);
  await writeRemotionProject({
    jobDir,
    slides,
    timing,
    audioRelativePath,
    lessonTitle: input.lessonTitle,
    moduleTitle: input.moduleTitle,
    track: input.track,
    owner: input.owner,
    render,
    brand,
  });

  await input.onStage?.("rendering");
  await runCommand(
    "npx",
    [
      "-y",
      "-p",
      REMOTION_CLI_PACKAGE,
      "remotion",
      "render",
      path.posix.join("remotion-jobs", input.jobId, "index.ts"),
      "LessonVideo",
      noAudioOutputPath,
      "--overwrite",
      "--codec=h264",
      "--concurrency=2",
    ],
    { cwd: webAppDir },
  );

  await runCommand(
    "ffmpeg",
    [
      "-y",
      "-i",
      narrationPath,
      "-af",
      "loudnorm",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      normalizedNarrationPath,
    ],
    { cwd: webAppDir },
  );

  await runCommand(
    "ffmpeg",
    [
      "-y",
      "-i",
      noAudioOutputPath,
      "-i",
      normalizedNarrationPath,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-shortest",
      "-movflags",
      "+faststart",
      finalOutputPath,
    ],
    { cwd: webAppDir },
  );

  if (!(await exists(finalOutputPath))) {
    warnings.push("Final video not found after FFmpeg finalize; returning raw Remotion output.");
    return {
      jobId: input.jobId,
      outputPath: noAudioOutputPath,
      outputFileName: path.basename(noAudioOutputPath),
      workDir: jobDir,
      warnings,
    };
  }

  return {
    jobId: input.jobId,
    outputPath: finalOutputPath,
    outputFileName: path.basename(finalOutputPath),
    workDir: jobDir,
    warnings,
  };
}

export async function cleanupGeneratedLessonArtifacts(jobId: string): Promise<void> {
  await fs.rm(path.join(jobsRoot, jobId), { recursive: true, force: true });
  await fs.rm(path.join(generatedPublicRoot, jobId), { recursive: true, force: true });
}

async function ensurePrerequisites(): Promise<void> {
  if (!(await exists(webAppDir))) {
    throw new Error(`Web app directory not found: ${webAppDir}`);
  }

  await fs.mkdir(jobsRoot, { recursive: true });
  await fs.mkdir(generatedPublicRoot, { recursive: true });

  await runCommand("ffmpeg", ["-version"], { cwd: webAppDir, allowFailure: false, quiet: true });
  await runCommand("ffprobe", ["-version"], { cwd: webAppDir, allowFailure: false, quiet: true });
}

function resolveSlides(
  slidesInput: StructuredSlideInput[] | null | undefined,
  script: string | null | undefined,
  fallbackTitle: string,
): SlideSpec[] {
  if (Array.isArray(slidesInput) && slidesInput.length > 0) {
    const normalized = slidesInput
      .map((slide, index) => ({
        id: slide.id?.trim() || `slide-${index + 1}`,
        layout: slide.layout ?? (index === 0 ? "title" : "bullets"),
        title: normalizeTitle(slide.title || `Slide ${index + 1}`),
        bullets: (slide.bullets ?? []).map((bullet) => truncateWords(bullet.trim(), 12)).filter(Boolean).slice(0, 4),
        callout: slide.callout?.trim() || null,
        narration: slide.narration.trim(),
      }))
      .filter((slide) => slide.narration.length > 0);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return parseSlides(script ?? "", fallbackTitle);
}

export function parseLessonScriptToSlides(script: string, fallbackTitle = "Lesson Segment"): StructuredSlideInput[] {
  return parseSlides(script, fallbackTitle).map((slide) => ({
    id: slide.id,
    layout: slide.layout,
    title: slide.title,
    bullets: slide.bullets,
    callout: slide.callout,
    narration: slide.narration,
  }));
}

function parseSlides(script: string, fallbackTitle: string): SlideSpec[] {
  const sceneSlides = parseSceneScript(script);
  if (sceneSlides.length > 0) {
    return sceneSlides.slice(0, 20);
  }

  const lines = script
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: Array<{ heading: string; body: string[] }> = [];
  let currentHeading = fallbackTitle;
  let currentBody: string[] = [];

  const pushSection = () => {
    if (currentBody.length === 0) {
      return;
    }
    sections.push({ heading: currentHeading, body: currentBody });
    currentBody = [];
  };

  for (const line of lines) {
    const headingMatch = /^\[(.+)]$/.exec(line);

    if (headingMatch) {
      pushSection();
      currentHeading = headingMatch[1]?.trim() || fallbackTitle;
      continue;
    }

    currentBody.push(line.replace(/^[-*]\s*/, ""));
  }

  pushSection();

  const rawSlides = sections
    .map((section, index) => {
      const title = normalizeTitle(section.heading);
      const bullets = section.body
        .map((entry) => entry.replace(/^\d+\.?\s*/, "").trim())
        .filter(Boolean)
        .map((entry) => truncateWords(entry, 12))
        .slice(0, 4);
      const narration = section.body.join(" ").trim();

      return {
        id: `slide-${index + 1}`,
        layout: index === 0 ? ("title" as const) : ("bullets" as const),
        title,
        bullets,
        callout: null,
        narration,
      };
    })
    .filter((slide) => slide.narration.length > 0);

  if (rawSlides.length > 0) {
    return rawSlides.slice(0, 14);
  }

  const paragraphs = script
    .split(/\n\s*\n/)
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 10);

  return paragraphs.map((paragraph, index) => ({
    id: `slide-${index + 1}`,
    layout: index === 0 ? ("title" as const) : ("bullets" as const),
    title: index === 0 ? fallbackTitle : `Section ${index + 1}`,
    bullets: toBullets(paragraph).map((entry) => truncateWords(entry, 12)).slice(0, 4),
    callout: null,
    narration: paragraph,
  }));
}

function parseSceneScript(script: string): SlideSpec[] {
  const rawLines = script.split(/\r?\n/);
  const sceneIndexes: number[] = [];

  rawLines.forEach((line, index) => {
    if (/^\s*scene\s+\d+/i.test(line)) {
      sceneIndexes.push(index);
    }
  });

  if (sceneIndexes.length === 0) {
    return [];
  }

  const slides: SlideSpec[] = [];

  for (let i = 0; i < sceneIndexes.length; i += 1) {
    const start = sceneIndexes[i] ?? 0;
    const end = i + 1 < sceneIndexes.length ? (sceneIndexes[i + 1] ?? rawLines.length) : rawLines.length;
    const block = rawLines.slice(start, end).map((line) => line.trim());

    const sceneMatch = /^scene\s+(\d+)/i.exec(block[0] ?? "");
    const sceneNumber = sceneMatch?.[1] ?? String(i + 1);
    let title = `Scene ${sceneNumber}`;
    const narrationLines: string[] = [];
    let inNarration = false;

    for (const line of block) {
      if (!line) {
        continue;
      }

      if (/^scene\s+\d+/i.test(line)) {
        continue;
      }

      const slideMatch = /^slide\s*:\s*(.+)$/i.exec(line);
      if (slideMatch?.[1]) {
        title = normalizeTitle(slideMatch[1]);
        continue;
      }

      const narrationMatch = /^narration\s*:?\s*(.*)$/i.exec(line);
      if (narrationMatch) {
        inNarration = true;
        if (narrationMatch[1]) {
          narrationLines.push(narrationMatch[1]);
        }
        continue;
      }

      if (/^(runtime|module|track|course|owner)\s*:/i.test(line)) {
        continue;
      }

      if (inNarration) {
        narrationLines.push(line);
      }
    }

    const narration = narrationLines.join(" ").replace(/\s+/g, " ").trim();
    if (!narration) {
      continue;
    }

    const lowerTitle = title.toLowerCase();
    const layout: SlideLayout =
      i === 0
        ? "title"
        : lowerTitle.includes("summary") || lowerTitle.includes("transition") || lowerTitle.includes("close")
          ? "outro"
          : "bullets";

    slides.push({
      id: `scene-${sceneNumber}`,
      layout,
      title,
      bullets: toBullets(narration).map((entry) => truncateWords(entry, 12)).slice(0, 4),
      callout: null,
      narration,
    });
  }

  return slides;
}

function buildTiming(
  slides: SlideSpec[],
  totalDurationSeconds: number,
  fps: number,
): {
  totalFrames: number;
  segments: Array<{ start: number; duration: number }>;
} {
  const audioFrames = Math.max(fps * 6, Math.ceil(totalDurationSeconds * fps));
  const baselineFrames = slides.map((slide) => {
    const wordCount = countWords(slide.narration);
    const narrationSeconds = Math.max(6, wordCount / 2.6 + 0.6 + (slide.layout === "title" ? 0.8 : 0));
    return Math.max(Math.round(narrationSeconds * fps), fps * 6);
  });
  const baselineTotal = baselineFrames.reduce((sum, value) => sum + value, 0);
  const targetFrames = Math.max(audioFrames, baselineTotal);
  const scale = baselineTotal > 0 ? targetFrames / baselineTotal : 1;

  const segments: Array<{ start: number; duration: number }> = [];
  let cursor = 0;

  baselineFrames.forEach((value, index) => {
    const remainingSlides = slides.length - index;
    const remainingFrames = targetFrames - cursor;
    const scaled = Math.max(fps * 6, Math.round(value * scale));
    const maxForSlide = Math.max(fps * 6, remainingFrames - fps * 6 * (remainingSlides - 1));
    const duration = index === slides.length - 1 ? remainingFrames : Math.min(scaled, maxForSlide);

    segments.push({ start: cursor, duration });
    cursor += duration;
  });

  return {
    totalFrames: targetFrames,
    segments,
  };
}

async function writeRemotionProject(input: {
  jobDir: string;
  slides: SlideSpec[];
  timing: { totalFrames: number; segments: Array<{ start: number; duration: number }> };
  audioRelativePath: string;
  lessonTitle: string;
  moduleTitle: string;
  track: string;
  owner: string;
  render: {
    width: number;
    height: number;
    fps: number;
  };
  brand: {
    logoUrl: string | null;
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
  };
}): Promise<void> {
  const slidesJsonPath = path.join(input.jobDir, "slides.json");
  const timingJsonPath = path.join(input.jobDir, "timing.json");
  const indexPath = path.join(input.jobDir, "index.ts");
  const rootPath = path.join(input.jobDir, "Root.tsx");
  const videoPath = path.join(input.jobDir, "Video.tsx");

  await fs.writeFile(slidesJsonPath, JSON.stringify(input.slides, null, 2), "utf8");
  await fs.writeFile(
    timingJsonPath,
    JSON.stringify(
      {
        totalFrames: input.timing.totalFrames,
        segments: input.timing.segments,
        audioRelativePath: input.audioRelativePath,
        lessonTitle: input.lessonTitle,
        moduleTitle: input.moduleTitle,
        track: input.track,
        owner: input.owner,
        fps: input.render.fps,
        width: input.render.width,
        height: input.render.height,
        brand: input.brand,
      },
      null,
      2,
    ),
    "utf8",
  );

  await fs.writeFile(
    indexPath,
    ["import { registerRoot } from 'remotion';", "import { RemotionRoot } from './Root';", "registerRoot(RemotionRoot);", ""].join("\n"),
    "utf8",
  );

  await fs.writeFile(
    rootPath,
    [
      "import React from 'react';",
      "import { Composition } from 'remotion';",
      "import slides from './slides.json';",
      "import timing from './timing.json';",
      "import { LessonVideo } from './Video';",
      "",
      "export const RemotionRoot: React.FC = () => {",
      "  return (",
      "    <Composition",
      "      id=\"LessonVideo\"",
      "      component={LessonVideo}",
      "      durationInFrames={timing.totalFrames}",
      "      fps={timing.fps}",
      "      width={timing.width}",
      "      height={timing.height}",
      "      defaultProps={{ slides, timing }}",
      "    />",
      "  );",
      "};",
      "",
    ].join("\n"),
    "utf8",
  );

  await fs.writeFile(videoPath, createVideoTemplate(), "utf8");
}

function createVideoTemplate(): string {
  return [
    "import React from 'react';",
    "import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from 'remotion';",
    "",
    "type Slide = { id: string; layout: 'title' | 'bullets' | 'callout' | 'outro'; title: string; bullets: string[]; callout: string | null; narration: string };",
    "type Timing = {",
    "  totalFrames: number;",
    "  segments: Array<{ start: number; duration: number }>;",
    "  audioRelativePath: string;",
    "  lessonTitle: string;",
    "  moduleTitle: string;",
    "  track: string;",
    "  owner: string;",
    "  fps: number;",
    "  width: number;",
    "  height: number;",
    "  brand: { logoUrl: string | null; primaryColor: string; accentColor: string; fontFamily: string };",
    "};",
    "",
    "export const LessonVideo: React.FC<{ slides: Slide[]; timing: Timing }> = ({ slides, timing }) => {",
    "  return (",
    "    <AbsoluteFill style={{ backgroundColor: '#F7FAFC', color: '#0F172A', fontFamily: timing.brand.fontFamily }}>",
    "      <Audio src={staticFile(timing.audioRelativePath)} />",
    "      {slides.map((slide, index) => {",
    "        const segment = timing.segments[index];",
    "        if (!segment) return null;",
    "        return (",
    "          <Sequence key={`${slide.id}-${index}`} from={segment.start} durationInFrames={segment.duration}>",
    "            <SlideFrame index={index} totalSlides={slides.length} segmentDuration={segment.duration} slide={slide} timing={timing} />",
    "          </Sequence>",
    "        );",
    "      })}",
    "    </AbsoluteFill>",
    "  );",
    "};",
    "",
    "const SlideFrame: React.FC<{ index: number; totalSlides: number; segmentDuration: number; slide: Slide; timing: Timing }> = ({ index, totalSlides, segmentDuration, slide, timing }) => {",
    "  const frame = useCurrentFrame();",
    "  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });",
    "  const translateY = interpolate(frame, [0, 18], [16, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });",
    "  const localProgress = Math.min(1, Math.max(0, frame / Math.max(segmentDuration, 1)));",
    "  const progressPct = ((index + localProgress) / Math.max(totalSlides, 1)) * 100;",
    "  const isTitle = slide.layout === 'title';",
    "  const isCallout = slide.layout === 'callout';",
    "  const isOutro = slide.layout === 'outro';",
    "",
    "  return (",
    "    <AbsoluteFill style={{ padding: 76, opacity, transform: `translateY(${translateY}px)` }}>",
    "      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>",
    "        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>",
    "          {timing.brand.logoUrl ? (",
    "            <img src={timing.brand.logoUrl} style={{ height: 44, width: 'auto', objectFit: 'contain' }} />",
    "          ) : (",
    "            <div style={{ fontSize: 28, fontWeight: 700, color: timing.brand.primaryColor }}>AWB Academy</div>",
    "          )}",
    "        </div>",
    "        <div style={{ fontSize: 24, color: timing.brand.primaryColor, fontWeight: 600 }}>{timing.track}</div>",
    "      </div>",
    "",
    "      <div style={{ marginTop: isTitle ? 120 : 60, maxWidth: 1500 }}>",
    "        <div style={{ fontSize: isTitle ? 64 : 54, lineHeight: 1.1, fontWeight: 700 }}>{slide.title}</div>",
    "        {isCallout && slide.callout ? (",
    "          <div style={{ marginTop: 36, borderLeft: `8px solid ${timing.brand.accentColor}`, background: '#EEF5FF', padding: '18px 24px', fontSize: 40, lineHeight: 1.3, fontWeight: 600 }}>",
    "            {slide.callout}",
    "          </div>",
    "        ) : null}",
    "        {!isTitle && !isOutro ? (",
    "          <ul style={{ marginTop: 30, fontSize: 34, lineHeight: 1.35, paddingLeft: 28 }}>",
    "            {slide.bullets.slice(0, 4).map((bullet, bulletIndex) => (",
    "              <li key={`${slide.id}-${bulletIndex}`} style={{ marginBottom: 16 }}>{bullet}</li>",
    "            ))}",
    "          </ul>",
    "        ) : null}",
    "        {isOutro ? (",
    "          <div style={{ marginTop: 42, fontSize: 36, color: timing.brand.primaryColor, fontWeight: 600 }}>End of lesson. Return to course library.</div>",
    "        ) : null}",
    "      </div>",
    "",
    "      <div style={{ marginTop: 'auto', fontSize: 22, opacity: 0.8 }}>",
    "        {timing.moduleTitle} | {timing.lessonTitle} | Owner: {timing.owner}",
    "      </div>",
    "      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 10, background: '#DDE7F3' }}>",
    "        <div style={{ width: `${progressPct}%`, height: '100%', background: timing.brand.accentColor }} />",
    "      </div>",
    "    </AbsoluteFill>",
    "  );",
    "};",
    "",
  ].join("\n");
}

async function synthesizeNarrationWithPolly(input: {
  text: string;
  voiceId: string;
  engine: PollyEngine;
  outputPath: string;
}): Promise<void> {
  const pollyClient = new PollyClient({ region: apiEnv.AWS_REGION });
  const chunks = chunkForPolly(input.text, 2400);
  const chunkFiles: string[] = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    if (!chunk) {
      continue;
    }

    const command = new SynthesizeSpeechCommand({
      Text: chunk,
      OutputFormat: "mp3",
      VoiceId: input.voiceId as VoiceId,
      Engine: input.engine,
    });

    const response = await pollyClient.send(command);
    if (!response.AudioStream) {
      throw new Error(`Polly returned no audio stream for chunk ${index + 1}.`);
    }

    const buffer = await audioStreamToBuffer(response.AudioStream);
    const partPath = `${input.outputPath.replace(/\.mp3$/i, "")}-part-${String(index + 1).padStart(2, "0")}.mp3`;
    await fs.writeFile(partPath, buffer);
    chunkFiles.push(partPath);
  }

  if (chunkFiles.length === 0) {
    throw new Error("Polly did not produce any narration chunks.");
  }

  if (chunkFiles.length === 1) {
    await fs.rename(chunkFiles[0], input.outputPath);
    return;
  }

  const concatFile = `${input.outputPath.replace(/\.mp3$/i, "")}-concat.txt`;
  const concatBody = chunkFiles.map((chunkFile) => `file '${chunkFile.replace(/'/g, "'\\''")}'`).join("\n");
  await fs.writeFile(concatFile, concatBody, "utf8");
  await runCommand("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-c:a", "libmp3lame", input.outputPath]);
  await fs.unlink(concatFile).catch(() => undefined);
  await Promise.all(chunkFiles.map((chunkFile) => fs.unlink(chunkFile).catch(() => undefined)));
}

async function synthesizeNarrationWithOpenAi(input: {
  text: string;
  voiceId: string;
  model: string;
  outputPath: string;
}): Promise<void> {
  if (!apiEnv.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for OpenAI TTS.");
  }

  const chunks = chunkForPolly(input.text, 3800);
  const chunkFiles: string[] = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    if (!chunk) {
      continue;
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiEnv.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        voice: input.voiceId,
        input: chunk,
        format: "mp3",
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI TTS request failed (${response.status}): ${detail}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const partPath = `${input.outputPath.replace(/\.mp3$/i, "")}-part-${String(index + 1).padStart(2, "0")}.mp3`;
    await fs.writeFile(partPath, Buffer.from(arrayBuffer));
    chunkFiles.push(partPath);
  }

  if (chunkFiles.length === 0) {
    throw new Error("OpenAI TTS returned no audio chunks.");
  }

  if (chunkFiles.length === 1) {
    await fs.rename(chunkFiles[0], input.outputPath);
    return;
  }

  const concatFile = `${input.outputPath.replace(/\.mp3$/i, "")}-concat.txt`;
  const concatBody = chunkFiles.map((chunkFile) => `file '${chunkFile.replace(/'/g, "'\\''")}'`).join("\n");
  await fs.writeFile(concatFile, concatBody, "utf8");
  await runCommand("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-c:a", "libmp3lame", input.outputPath]);
  await fs.unlink(concatFile).catch(() => undefined);
  await Promise.all(chunkFiles.map((chunkFile) => fs.unlink(chunkFile).catch(() => undefined)));
}

async function synthesizeNarration(input: {
  provider: TtsProvider;
  text: string;
  voiceId: string;
  engine: PollyEngine;
  model: string;
  outputPath: string;
}): Promise<void> {
  if (input.provider === "openai-tts") {
    await synthesizeNarrationWithOpenAi({
      text: input.text,
      voiceId: input.voiceId,
      model: input.model,
      outputPath: input.outputPath,
    });
    return;
  }

  await synthesizeNarrationWithPolly({
    text: input.text,
    voiceId: input.voiceId,
    engine: input.engine,
    outputPath: input.outputPath,
  });
}

async function audioStreamToBuffer(stream: unknown): Promise<Buffer> {
  if (typeof stream === "object" && stream !== null && "transformToByteArray" in stream) {
    const transformable = stream as { transformToByteArray: () => Promise<Uint8Array> };
    const bytes = await transformable.transformToByteArray();
    return Buffer.from(bytes);
  }

  if (stream instanceof Uint8Array) {
    return Buffer.from(stream);
  }

  if (typeof stream === "object" && stream !== null && Symbol.asyncIterator in stream) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array | Buffer | string>) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else if (typeof chunk === "string") {
        chunks.push(Buffer.from(chunk));
      } else {
        chunks.push(Buffer.from(chunk));
      }
    }
    return Buffer.concat(chunks);
  }

  throw new Error("Unsupported Polly AudioStream type.");
}

function chunkForPolly(text: string, maxLength: number): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return [normalized];
  }

  const sentences = normalized.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (sentence.length <= maxLength) {
      current = sentence;
      continue;
    }

    let cursor = 0;
    while (cursor < sentence.length) {
      chunks.push(sentence.slice(cursor, cursor + maxLength));
      cursor += maxLength;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.filter(Boolean);
}

function normalizeTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").replace(/^slide\s+\d+\s*[-:]*\s*/i, "").trim() || "Lesson Segment";
}

function toBullets(paragraph: string): string[] {
  const items = paragraph
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^[\-•]\s*/, ""));

  return items.length > 0 ? items : [paragraph];
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return text;
  }

  return `${words.slice(0, maxWords).join(" ")}...`;
}

async function probeDurationSeconds(filePath: string): Promise<number | null> {
  const output = await runCommand(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath],
    { quiet: true },
  );

  const parsed = Number.parseFloat(output.stdout.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function runCommand(
  command: string,
  args: string[],
  options?: { cwd?: string; allowFailure?: boolean; quiet?: boolean },
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to execute ${command}: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0 || options?.allowFailure) {
        resolve({ stdout, stderr });
        return;
      }

      const detail = [stdout, stderr].filter(Boolean).join("\n").trim();
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}.${detail ? `\n${detail}` : ""}`));
    });
  });
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
