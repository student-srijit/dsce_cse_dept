import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBase64Image(input: string): string {
  return input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function extractPan(text: string): string | null {
  const normalized = text.toUpperCase().replace(/[^A-Z0-9]/g, " ");
  const candidates = normalized.match(/[A-Z]{5}[0-9]{4}[A-Z]/g);
  return candidates?.[0] ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const imageBase64 = asString(body?.imageBase64);
    const declaredPanRaw = asString(body?.declaredPan);

    if (!imageBase64) {
      return NextResponse.json(
        { error: "imageBase64 is required" },
        { status: 400 },
      );
    }

    if (!declaredPanRaw) {
      return NextResponse.json(
        { error: "declaredPan is required" },
        { status: 400 },
      );
    }

    const declaredPan = declaredPanRaw.toUpperCase();
    if (!PAN_REGEX.test(declaredPan)) {
      return NextResponse.json(
        { error: "declaredPan must match PAN format ABCDE1234F" },
        { status: 400 },
      );
    }

    let imageBuffer: Buffer;
    try {
      imageBuffer = Buffer.from(normalizeBase64Image(imageBase64), "base64");
    } catch {
      return NextResponse.json(
        { error: "imageBase64 is not valid base64 image data" },
        { status: 400 },
      );
    }

    if (imageBuffer.length === 0) {
      return NextResponse.json(
        { error: "Decoded image is empty" },
        { status: 400 },
      );
    }

    let recognize: (typeof import("tesseract.js"))["recognize"];
    try {
      ({ recognize } = await import("tesseract.js"));
    } catch {
      return NextResponse.json(
        { error: "OCR engine is unavailable on this server" },
        { status: 503 },
      );
    }

    const { data } = await recognize(imageBuffer, "eng");
    const extractedPan = extractPan(data.text || "");

    if (!extractedPan) {
      return NextResponse.json(
        { error: "Could not detect a valid PAN number in the uploaded image" },
        { status: 422 },
      );
    }

    const confidence =
      typeof data.confidence === "number"
        ? Number(data.confidence.toFixed(2))
        : null;

    return NextResponse.json(
      {
        declaredPan,
        extractedPan,
        matched: extractedPan === declaredPan,
        confidence,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "PAN OCR verification failed",
        details: message,
      },
      { status: 500 },
    );
  }
}
