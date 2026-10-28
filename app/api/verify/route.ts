import { NextResponse } from "next/server";
import { verifyEnvelope } from "../../../lib/server-verify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(verifyEnvelope(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ valid: false, error: message }, { status: 400 });
  }
}
