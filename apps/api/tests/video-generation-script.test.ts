import { describe, expect, it } from "vitest";
import { parseLessonScriptToSlides } from "../src/lib/videoGeneration.ts";

describe("parseLessonScriptToSlides", () => {
  it("parses Scene/Slide/Narration scripts into structured slides", () => {
    const script = `
Runtime: ~9 minutes

Scene 1
Slide: Course Title
Narration
Welcome to the first clinical module of AWB Academy.
In this lesson we will discuss where wound care patients are typically identified.

Scene 2
Slide: Chronic Wound Statistics
Narration
Chronic wounds affect millions of patients each year.
Early detection is one of the most important factors influencing healing success.

Scene 3
Slide: Summary
Narration
Understanding where wound patients originate allows clinicians to intervene earlier.
`.trim();

    const slides = parseLessonScriptToSlides(script, "Fallback");

    expect(slides.length).toBe(3);
    expect(slides[0]?.title).toBe("Course Title");
    expect(slides[0]?.layout).toBe("title");
    expect(slides[1]?.title).toBe("Chronic Wound Statistics");
    expect(slides[1]?.layout).toBe("bullets");
    expect(slides[2]?.title).toBe("Summary");
    expect(slides[2]?.layout).toBe("outro");
    expect(slides[1]?.narration).toContain("Early detection");
  });
});

