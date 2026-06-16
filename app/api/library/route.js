import { NextResponse } from "next/server";
import { fetchLibrary } from "../../../lib/library";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  try {
    const rows = await fetchLibrary();
    return NextResponse.json({ rows, count: rows.length });
  } catch (e) {
    return NextResponse.json({ rows: [], count: 0, error: true });
  }
}
