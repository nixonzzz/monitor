import { NextResponse } from "next/server";
import {
  fetchNewsFromRss,
  normalizeNewsItems,
  type NewsItem
} from "../../../lib/news";

/** Только российские источники. Ленты про экономику, финансы, рынки, геополитику. */
const RSS_FEEDS = [
  { url: "https://www.cbr.ru/rss/RssNews", category: "REG" as const, sourceName: "ЦБ РФ" },
  { url: "https://www.cbr.ru/rss/RssPress", category: "REG" as const, sourceName: "ЦБ РФ" },
  { url: "https://www.vedomosti.ru/rss/news.xml", category: "MACRO" as const, sourceName: "Ведомости" },
  { url: "https://www.vedomosti.ru/rss/rubric/economics.xml", category: "MACRO" as const, sourceName: "Ведомости" },
  { url: "https://www.vedomosti.ru/rss/rubric/finance.xml", category: "BONDS" as const, sourceName: "Ведомости" },
  { url: "https://lenta.ru/rss/news", category: "MACRO" as const, sourceName: "Лента.ру" },
  { url: "https://lenta.ru/rss/news/russia", category: "MACRO" as const, sourceName: "Лента.ру" },
  { url: "https://rssexport.rbc.ru/rbcnews/news/20/full.rss", category: "MACRO" as const, sourceName: "РБК" }
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const results = await Promise.allSettled(
      RSS_FEEDS.map(async (feed) => {
        const raw = await fetchNewsFromRss(feed.url);
        return normalizeNewsItems(raw, feed.category, feed.sourceName);
      })
    );

    const all: NewsItem[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") all.push(...r.value);
    }
    all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    const uniq = Array.from(
      new Map(all.map((n) => [n.id, n])).values()
    ).slice(0, 80);

    return NextResponse.json({
      items: uniq,
      count: uniq.length
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { items: [], count: 0 },
      { status: 502 }
    );
  }
}
