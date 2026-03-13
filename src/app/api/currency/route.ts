import { NextResponse } from "next/server";
import { fetchCurrency } from "@/lib/moex";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchCurrency();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ USDRUB: null, CNYRUB: null });
  }
}
