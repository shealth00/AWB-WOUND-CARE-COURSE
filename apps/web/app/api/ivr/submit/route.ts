import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { IvrPayload } from "@/lib/ivr/types";
import { saveIvrSubmission } from "@/lib/ivr/dynamodb";
import { validateIvrPayload } from "@/lib/ivr/validate";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as IvrPayload;
    const validation = validateIvrPayload(body);

    if (!validation.valid) {
      return NextResponse.json(
        {
          ok: false,
          message: "Validation failed.",
          errors: validation.errors,
        },
        { status: 400 },
      );
    }

    const referenceId = `AWB-IVR-${randomUUID()}`;
    await saveIvrSubmission(referenceId, body);

    return NextResponse.json({
      ok: true,
      referenceId,
      message: "IVR submitted successfully.",
    });
  } catch (error) {
    console.error("IVR submit error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Internal server error.",
      },
      { status: 500 },
    );
  }
}
