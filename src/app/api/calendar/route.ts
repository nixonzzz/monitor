import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Календарь: заседания Совета директоров ЦБ РФ (открытые данные, примеры дат). */
const CBR_MEETINGS = [
  "2025-02-14",
  "2025-03-21",
  "2025-04-25",
  "2025-06-13",
  "2025-07-25",
  "2025-09-12",
  "2025-10-24",
  "2025-12-12",
  "2026-02-06",
  "2026-03-20",
  "2026-04-24",
  "2026-06-12",
  "2026-07-24",
  "2026-09-11",
  "2026-10-23",
  "2026-12-11"
].map((date) => ({ date, title: "Заседание Совета директоров Банка России (ключевая ставка)" }));

export async function GET() {
  const now = new Date().toISOString().slice(0, 10);
  const upcoming = CBR_MEETINGS.filter((e) => e.date >= now).slice(0, 12);
  return NextResponse.json({ events: upcoming });
}
