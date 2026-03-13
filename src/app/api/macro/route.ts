import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Ключевая ставка ЦБ РФ — парсим таблицу с cbr.ru/hd_base/keyrate (открытые данные). */
export async function GET() {
  try {
    const url = "https://www.cbr.ru/hd_base/keyrate/?UniDbQuery.Posted=True&UniDbQuery.From=01.01.2025&UniDbQuery.To=31.12.2026";
    const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } });
    const html = await res.text();
    // HTML-таблица: первая строка данных <td>дата</td> ... <td>ставка</td> (с возможными переносами)
    const htmlMatch = html.match(/<td[^>]*>\s*(\d{2}\.\d{2}\.\d{4})\s*<\/td>[\s\S]*?<td[^>]*>\s*(\d[\d,]*)\s*<\/td>/);
    if (htmlMatch) {
      const rate = parseFloat(htmlMatch[2].replace(",", "."));
      return NextResponse.json({ keyRate: rate, keyRateDate: htmlMatch[1] });
    }
    // Текстовая таблица (markdown или превью): | 30.12.2025 | 16,00 |
    const pipeMatch = html.match(/\|\s*(\d{2}\.\d{2}\.\d{4})\s*\|\s*(\d[\d,]*)\s*\|/);
    if (pipeMatch) {
      const rate = parseFloat(pipeMatch[2].replace(",", "."));
      return NextResponse.json({ keyRate: rate, keyRateDate: pipeMatch[1] });
    }
    // Любая дата dd.mm.yyyy и рядом число с запятой (годовых)
    const fallback = html.match(/(\d{2}\.\d{2}\.\d{4})[\s\S]{0,80}?(\d{1,2},\d{2})/);
    if (fallback) {
      const rate = parseFloat(fallback[2].replace(",", "."));
      if (rate >= 1 && rate <= 30) return NextResponse.json({ keyRate: rate, keyRateDate: fallback[1] });
    }
    return NextResponse.json({ keyRate: null, keyRateDate: null });
  } catch {
    return NextResponse.json({ keyRate: null, keyRateDate: null });
  }
}
