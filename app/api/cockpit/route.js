import { NextResponse } from "next/server";
import { buildCockpit } from "../../../lib/data";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  try {
    const data = await buildCockpit();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ configured: true, error: true, late: [], week: [], pubs: [], video: [], raci: [] });
  }
}
