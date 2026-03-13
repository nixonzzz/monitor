/**
 * Новости только из российских источников.
 * Показываем только то, что влияет на рынки: геополитика, акции, облигации, макро, отчётность, регуляторы.
 */

import Parser from "rss-parser";

export type NewsCategory = "GEOPOLITICS" | "MACRO" | "STOCKS" | "BONDS" | "EARN" | "REG";

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  timeAgo: string;
  category: NewsCategory;
  source: string;
};

/** Ключевые слова по категориям (для отображения и фильтра). */
const KEYWORDS: Record<NewsCategory, string[]> = {
  GEOPOLITICS: [
    "геополитик", "санкци", "эмбарго", "нефть", "газ", "конфликт", "война", "рубль", "доллар", "юань",
    "экспорт", "импорт", "опек", "оpec", "сша", "европа", "китай", "нато", "мвф", "вто",
    "geopolitic", "sanction", "oil", "gas", "ruble", "dollar", "export", "import"
  ],
  MACRO: [
    "инфляци", "ключевая ставка", "ввп", "цб", "банк россии", "центробанк", "рефинансирован",
    "inflation", "rate", "gdp", "central bank", "fed", "ecb", "макро", "экономик", "рынок"
  ],
  STOCKS: [
    "акци", "акций", "биржа", "московская биржа", "мосбиржа", "индекс", "imoex", "rts", "котировк",
    "торг", "сделок", "капитализац", "голубые фишки", "stock", "equity", "index", "moex", "trading"
  ],
  BONDS: [
    "облигаци", "офз", "еврооблигац", "купон", "доходность", "bond", "yield", "treasury", "долг", "займ"
  ],
  EARN: [
    "дивиденд", "отчётность", "выручка", "прибыл", "квартал", "результат", "earnings", "revenue", "dividend", "quarter"
  ],
  REG: [
    "регулятор", "цб рф", "банк россии", "пресс-релиз", "решение совета", "regulation", "regulator", "sec"
  ]
};

/** Проверка: новость связана с рынками (геополитика, акции, облигации, макро и т.д.). */
const MARKET_RELEVANT_KEYWORDS = [
  ...KEYWORDS.GEOPOLITICS,
  ...KEYWORDS.MACRO,
  ...KEYWORDS.STOCKS,
  ...KEYWORDS.BONDS,
  ...KEYWORDS.EARN,
  ...KEYWORDS.REG
];

function isMarketRelevant(title: string, description: string): boolean {
  const text = (title + " " + description).toLowerCase();
  return MARKET_RELEVANT_KEYWORDS.some((w) => text.includes(w));
}

function detectCategory(title: string, description: string): NewsCategory {
  const text = (title + " " + description).toLowerCase();
  const order: NewsCategory[] = ["GEOPOLITICS", "BONDS", "EARN", "STOCKS", "REG", "MACRO"];
  for (const cat of order) {
    if (KEYWORDS[cat].some((w) => text.includes(w))) return cat;
  }
  return "MACRO";
}

function timeAgo(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "1M";
  if (sec < 3600) return `${Math.floor(sec / 60)}M`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}H`;
  return `${Math.floor(sec / 86400)}D`;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": UA }
});

export async function fetchNewsFromRss(rssUrl: string): Promise<{ title: string; link: string; pubDate: string; description: string }[]> {
  try {
    const feed = await parser.parseURL(rssUrl);
    if (!feed?.items?.length) return [];
    return feed.items.map((item) => ({
      title: item.title?.trim() ?? "",
      link: item.link ?? item.guid ?? "",
      pubDate: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
      description: (item.contentSnippet ?? item.content ?? "").slice(0, 500)
    }));
  } catch {
    return [];
  }
}

export function normalizeNewsItems(
  raw: { title: string; link: string; pubDate: string; description: string }[],
  feedCategory: NewsCategory,
  sourceName: string = "РФ"
): NewsItem[] {
  const seen = new Set<string>();
  return raw
    .filter((item) => {
      if (item.title.length === 0) return false;
      if (!isMarketRelevant(item.title, item.description)) return false;
      const key = (item.title + item.link).slice(0, 120);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => {
      const pub = new Date(item.pubDate);
      const pubDateStr = Number.isNaN(pub.getTime()) ? new Date().toISOString() : item.pubDate;
      const category = detectCategory(item.title, item.description);
      return {
        id: item.link || `n-${item.title.slice(0, 30)}`,
        title: item.title,
        link: item.link,
        pubDate: pubDateStr,
        timeAgo: timeAgo(Number.isNaN(pub.getTime()) ? new Date() : pub),
        category,
        source: sourceName
      };
    });
}
