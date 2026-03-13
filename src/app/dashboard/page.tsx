"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  fetchBonds,
  fetchFutures,
  fetchIndices,
  fetchStocks,
  type BondRow,
  type FuturesRow,
  type IndexRow,
  type StocksResponse
} from "../../lib/moex";
import type { NewsItem } from "../../lib/news";
import styles from "./dashboard.module.css";

const POLL_MS = 3000;
const NEWS_POLL_MS = 20000;
const NEWS_CATEGORIES = ["ALL", "GEOPOLITICS", "MACRO", "STOCKS", "BONDS", "EARN", "REG"] as const;

const MAIN_TABS = ["Акции", "Облигации", "Фьючерсы", "Стратегии", "Арбитраж & RV", "Фонды", "Макро", "Календарь", "Аналитика"] as const;
type MainTabId = (typeof MAIN_TABS)[number];

function formatNum(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + " млрд";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " млн";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + " тыс";
  return n.toFixed(2);
}

/** Текущее время по Москве в формате ЧЧ:ММ:СС */
function getMoscowTime(): string {
  return new Date().toLocaleTimeString("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

/** Приводит время с MOEX (например "10:30:00" или "2024-03-12 10:30:00") к виду HH:MM:SS */
function formatUpdTime(s: string | null): string {
  if (!s || !s.trim()) return "—";
  const trimmed = s.trim();
  const timePart = trimmed.includes(" ") ? trimmed.split(" ").pop() : trimmed;
  if (timePart && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timePart)) return timePart.length === 5 ? `${timePart}:00` : timePart.slice(0, 8);
  return trimmed.length > 8 ? trimmed.slice(11, 19) : trimmed;
}

function newsTimeAgo(pubDate: string): string {
  const sec = Math.floor((Date.now() - new Date(pubDate).getTime()) / 1000);
  if (sec < 60) return "1M";
  if (sec < 3600) return `${Math.floor(sec / 60)}M`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}H`;
  return `${Math.floor(sec / 86400)}D`;
}

export default function DashboardPage() {
  const [indices, setIndices] = useState<IndexRow[]>([]);
  const [currency, setCurrency] = useState<{ USDRUB: number | null; CNYRUB: number | null }>({
    USDRUB: null,
    CNYRUB: null
  });
  const [stocksData, setStocksData] = useState<StocksResponse | null>(null);
  const [now, setNow] = useState("");
  const [updTime, setUpdTime] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  type StockSortKey = "SECID" | "SHORTNAME" | "SECTORID" | "LAST" | "LASTCHANGEPRCNT" | "VALTODAY" | "NUMTRADES";
  const [stockSort, setStockSort] = useState<{ key: StockSortKey; dir: "asc" | "desc" }>({ key: "SECID", dir: "asc" });
  const [search, setSearch] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsFilter, setNewsFilter] = useState<string>("ALL");
  const [newsSearch, setNewsSearch] = useState("");
  const [newsUpdating, setNewsUpdating] = useState(false);
  const [mainTab, setMainTab] = useState<MainTabId>("Акции");
  const [bondsData, setBondsData] = useState<{ bonds: BondRow[]; totalTurnover: number; totalTrades: number } | null>(null);
  const [futuresData, setFuturesData] = useState<{ futures: FuturesRow[]; totalTurnover: number; totalTrades: number } | null>(null);
  const [keyRate, setKeyRate] = useState<{ keyRate: number | null; keyRateDate: string | null }>({ keyRate: null, keyRateDate: null });
  const [calendarEvents, setCalendarEvents] = useState<{ date: string; title: string }[]>([]);

  const loadNews = useCallback(async () => {
    setNewsUpdating(true);
    try {
      const res = await fetch("/api/news");
      const data = await res.json();
      if (Array.isArray(data.items)) setNews(data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setNewsUpdating(false);
    }
  }, []);

  const load = useCallback(async () => {
    setIsUpdating(true);
    const [indSettled, curSettled, stSettled, macroSettled] = await Promise.allSettled([
      fetchIndices(),
      fetch("/api/currency").then((r) => r.json()),
      fetchStocks(0),
      fetch("/api/macro").then((r) => r.json())
    ]);
    if (indSettled.status === "fulfilled") {
      setIndices(indSettled.value.indices);
      setUpdTime(indSettled.value.updateTime ?? null);
    }
    if (curSettled.status === "fulfilled") setCurrency(curSettled.value);
    if (stSettled.status === "fulfilled") {
      setStocksData(stSettled.value);
      if (indSettled.status !== "fulfilled") setUpdTime(stSettled.value.updateTime ?? null);
      else setUpdTime((t) => indSettled.value.updateTime ?? stSettled.value.updateTime ?? t);
    }
    if (macroSettled.status === "fulfilled" && macroSettled.value?.keyRate != null)
      setKeyRate({ keyRate: macroSettled.value.keyRate, keyRateDate: macroSettled.value.keyRateDate ?? null });
    setIsUpdating(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const loadCurrency = useCallback(async () => {
    try {
      const res = await fetch("/api/currency", { cache: "no-store" });
      const data = await res.json();
      if (data && (data.USDRUB != null || data.CNYRUB != null))
        setCurrency({
          USDRUB: typeof data.USDRUB === "number" ? data.USDRUB : null,
          CNYRUB: typeof data.CNYRUB === "number" ? data.CNYRUB : null
        });
    } catch {
      // keep previous values
    }
  }, []);

  useEffect(() => {
    loadCurrency();
    const t = setInterval(loadCurrency, POLL_MS);
    return () => clearInterval(t);
  }, [loadCurrency]);

  useEffect(() => {
    loadNews();
    const t = setInterval(loadNews, NEWS_POLL_MS);
    return () => clearInterval(t);
  }, [loadNews]);

  const loadBonds = useCallback(async () => {
    try {
      const r = await fetchBonds(0);
      setBondsData(r);
    } catch {
      setBondsData(null);
    }
  }, []);
  const loadFutures = useCallback(async () => {
    try {
      const r = await fetchFutures(0);
      setFuturesData(r);
    } catch {
      setFuturesData(null);
    }
  }, []);
  const loadMacro = useCallback(async () => {
    try {
      const res = await fetch("/api/macro");
      const data = await res.json();
      setKeyRate({ keyRate: data.keyRate ?? null, keyRateDate: data.keyRateDate ?? null });
    } catch {
      setKeyRate({ keyRate: null, keyRateDate: null });
    }
  }, []);
  const loadCalendar = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar");
      const data = await res.json();
      setCalendarEvents(Array.isArray(data.events) ? data.events : []);
    } catch {
      setCalendarEvents([]);
    }
  }, []);

  useEffect(() => {
    if (mainTab === "Облигации") loadBonds();
    if (mainTab === "Фьючерсы") loadFutures();
    if (mainTab === "Макро") loadMacro();
    if (mainTab === "Календарь") loadCalendar();
  }, [mainTab, loadBonds, loadFutures, loadMacro, loadCalendar]);

  useEffect(() => {
    setNow(getMoscowTime());
    const t = setInterval(() => setNow(getMoscowTime()), 1000);
    return () => clearInterval(t);
  }, []);

  const [timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTimeTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const newsLast24h = news.filter((n) => new Date(n.pubDate).getTime() >= oneDayAgo);
  const newsCountToday = newsLast24h.length;

  const filteredNews = newsLast24h.filter((n) => {
    if (newsFilter !== "ALL" && n.category !== newsFilter) return false;
    if (newsSearch.trim()) {
      const q = newsSearch.trim().toLowerCase();
      return n.title.toLowerCase().includes(q);
    }
    return true;
  });

  const stocks = stocksData?.stocks ?? [];
  const filtered =
    sectorFilter === "all"
      ? stocks
      : stocks.filter((s) => (s.SECTORID ?? s.SECTYPE ?? "") === sectorFilter);
  const searchLower = search.trim().toLowerCase();
  const filteredBySearch = searchLower
    ? filtered.filter(
        (s) =>
          s.SECID.toLowerCase().includes(searchLower) ||
          s.SHORTNAME.toLowerCase().includes(searchLower)
      )
    : filtered;

  const getSortVal = (row: (typeof filteredBySearch)[0], key: StockSortKey): string | number | null =>
    key === "SECTORID" ? (row.SECTORID ?? row.SECTYPE ?? null) : (row[key] ?? null);

  const displayed = [...filteredBySearch].sort((a, b) => {
    const k = stockSort.key;
    const mul = stockSort.dir === "asc" ? 1 : -1;
    const va = getSortVal(a, k);
    const vb = getSortVal(b, k);
    if (va == null && vb == null) return 0;
    if (va == null) return mul;
    if (vb == null) return -mul;
    if (typeof va === "number" && typeof vb === "number") return mul * (va - vb);
    return mul * String(va).localeCompare(String(vb));
  });

  const sectors = Array.from(new Set(stocks.map((s) => s.SECTORID ?? s.SECTYPE).filter(Boolean))) as string[];
  const toggleSort = (key: StockSortKey) => {
    setStockSort((prev) => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
  };

  return (
    <div className={styles.root}>
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h1 className={styles.title}>MONITOR</h1>
          <div className={styles.metrics}>
            <span className={styles.metric}>
              KC {keyRate.keyRate != null ? `${keyRate.keyRate}%` : "—"}
            </span>
            <span className={styles.metric}>RUSFAR —</span>
            {indices.map((idx) => (
              <span key={idx.SECID} className={styles.metric}>
                {idx.SECID === "RTSI" ? "RTS" : idx.SECID} {idx.LAST != null ? idx.LAST.toFixed(0) : "—"}
                {idx.LASTCHANGEPRCNT != null && (
                  <span className={idx.LASTCHANGEPRCNT >= 0 ? styles.positive : styles.negative}>
                    {" "}
                    {idx.LASTCHANGEPRCNT >= 0 ? "+" : ""}
                    {idx.LASTCHANGEPRCNT.toFixed(2)}%
                  </span>
                )}
              </span>
            ))}
            <span className={styles.metric}>USDRUB {currency.USDRUB != null ? currency.USDRUB.toFixed(2) : "—"}</span>
            <span className={styles.metric}>CNYRUB {currency.CNYRUB != null ? currency.CNYRUB.toFixed(4) : "—"}</span>
          </div>
        </div>
        <div className={styles.topBarRight}>
          <span className={`${styles.live} ${isUpdating ? styles.livePulse : ""}`}>Live</span>
          <span className={styles.time} suppressHydrationWarning title="Московское время">{now ? `МСК ${now}` : "—"}</span>
          <button type="button" className={styles.terminalBtn}>
            TERMINAL
          </button>
          <Link href="/" className={styles.user}>
            Nikk
          </Link>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.newsHeader}>
            <span>NEWS</span>
            <span className={styles.newsCount}>
              ЗА СУТКИ: {newsCountToday}
              {newsUpdating && <span className={styles.newsDot} />}
            </span>
          </div>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search..."
            value={newsSearch}
            onChange={(e) => setNewsSearch(e.target.value)}
          />
          <div className={styles.newsFilters}>
            {NEWS_CATEGORIES.map((f) => (
              <button
                key={f}
                type="button"
                className={`${styles.filterBtn} ${newsFilter === f ? styles.filterBtnActive : ""}`}
                onClick={() => setNewsFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <ul className={styles.newsList}>
            {filteredNews.slice(0, 80).map((n) => (
              <li key={n.id} className={styles.newsItem}>
                <span className={styles.newsTime}>{newsTimeAgo(n.pubDate)}</span>
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.newsTitle}
                  title={n.title}
                >
                  {n.title}
                </a>
                <span className={styles.newsTag}>/{n.category} · {n.source}</span>
              </li>
            ))}
          </ul>
        </aside>

        <main className={styles.main}>
          <div className={styles.tabs}>
            {MAIN_TABS.map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.tab} ${mainTab === t ? styles.tabActive : ""}`}
                onClick={() => setMainTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className={styles.subTabs}>
            {["Market Data", "Див Арбитраж", "Фундаментал", "Консенсус", "Объёмы"].map((t, i) => (
              <button
                key={t}
                type="button"
                className={`${styles.subTab} ${i === 0 ? styles.subTabActive : ""}`}
              >
                {t}
              </button>
            ))}
          </div>

          {mainTab === "Акции" && (
            <>
              <div className={styles.toolbar}>
                <label className={styles.sectorLabel}>
                  Сектор
                  <select
                    className={styles.sectorSelect}
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                  >
                    <option value="all">Все акции ({stocks.length})</option>
                    {sectors.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={styles.cards}>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>ТИКЕРОВ</span>
                  <span className={styles.cardValue}>{stocksData?.totalTickers ?? 0}</span>
                </div>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>ОБОРОТ</span>
                  <span className={styles.cardValue}>
                    {stocksData ? formatNum(stocksData.totalTurnover) : "—"}
                  </span>
                </div>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>СДЕЛОК</span>
                  <span className={styles.cardValue}>
                    {stocksData?.totalTrades != null
                      ? stocksData.totalTrades.toLocaleString("ru-RU")
                      : "—"}
                  </span>
                </div>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>СР.ДИВ</span>
                  <span className={`${styles.cardValue} ${styles.positive}`}>0.086</span>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.sortTh} onClick={() => toggleSort("SECID")}>ТИКЕР {stockSort.key === "SECID" && (stockSort.dir === "asc" ? "↑" : "↓")}</th>
                      <th className={styles.sortTh} onClick={() => toggleSort("SHORTNAME")}>НАЗВАНИЕ {stockSort.key === "SHORTNAME" && (stockSort.dir === "asc" ? "↑" : "↓")}</th>
                      <th className={styles.sortTh} onClick={() => toggleSort("SECTORID")}>СЕКТОР {stockSort.key === "SECTORID" && (stockSort.dir === "asc" ? "↑" : "↓")}</th>
                      <th className={styles.sortTh} onClick={() => toggleSort("LAST")}>ЦЕНА {stockSort.key === "LAST" && (stockSort.dir === "asc" ? "↑" : "↓")}</th>
                      <th className={styles.sortTh} onClick={() => toggleSort("LASTCHANGEPRCNT")}>ИЗМ. {stockSort.key === "LASTCHANGEPRCNT" && (stockSort.dir === "asc" ? "↑" : "↓")}</th>
                      <th className={styles.sortTh} onClick={() => toggleSort("VALTODAY")}>ОБОРОТ {stockSort.key === "VALTODAY" && (stockSort.dir === "asc" ? "↑" : "↓")}</th>
                      <th className={styles.sortTh} onClick={() => toggleSort("NUMTRADES")}>СДЕЛКИ {stockSort.key === "NUMTRADES" && (stockSort.dir === "asc" ? "↑" : "↓")}</th>
                      <th>VWAP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.slice(0, 100).map((row) => (
                      <tr key={row.SECID}>
                        <td className={styles.ticker}>{row.SECID}</td>
                        <td>{row.SHORTNAME}</td>
                        <td>{row.SECTORID ?? row.SECTYPE ?? "—"}</td>
                        <td>{row.LAST != null ? row.LAST.toFixed(2) : "—"}</td>
                        <td>
                          {row.LASTCHANGEPRCNT != null ? (
                            <span className={row.LASTCHANGEPRCNT >= 0 ? styles.positive : styles.negative}>
                              {row.LASTCHANGEPRCNT >= 0 ? "+" : ""}{row.LASTCHANGEPRCNT.toFixed(2)}%
                            </span>
                          ) : "—"}
                        </td>
                        <td>{row.VALTODAY != null ? formatNum(row.VALTODAY) : "—"}</td>
                        <td>{row.NUMTRADES != null ? row.NUMTRADES.toLocaleString("ru-RU") : "—"}</td>
                        <td>{row.WAPRICE != null ? row.WAPRICE.toFixed(2) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {mainTab === "Облигации" && (
            <>
              <div className={styles.cards}>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>ТИКЕРОВ</span>
                  <span className={styles.cardValue}>{bondsData?.bonds.length ?? 0}</span>
                </div>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>ОБОРОТ</span>
                  <span className={styles.cardValue}>
                    {bondsData ? formatNum(bondsData.totalTurnover) : "—"}
                  </span>
                </div>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>СДЕЛОК</span>
                  <span className={styles.cardValue}>
                    {bondsData?.totalTrades != null ? bondsData.totalTrades.toLocaleString("ru-RU") : "—"}
                  </span>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ТИКЕР</th>
                      <th>НАЗВАНИЕ</th>
                      <th>ЦЕНА</th>
                      <th>ИЗМ.%</th>
                      <th>ДОХОДНОСТЬ</th>
                      <th>ОБОРОТ</th>
                      <th>СДЕЛКИ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bondsData?.bonds ?? []).slice(0, 80).map((row) => (
                      <tr key={row.SECID}>
                        <td className={styles.ticker}>{row.SECID}</td>
                        <td>{row.SHORTNAME}</td>
                        <td>{row.LAST != null ? row.LAST.toFixed(2) : "—"}</td>
                        <td>
                          {row.LASTCHANGEPRCNT != null ? (
                            <span className={row.LASTCHANGEPRCNT >= 0 ? styles.positive : styles.negative}>
                              {row.LASTCHANGEPRCNT >= 0 ? "+" : ""}{row.LASTCHANGEPRCNT.toFixed(2)}%
                            </span>
                          ) : "—"}
                        </td>
                        <td>{row.YIELD != null ? row.YIELD.toFixed(2) + "%" : "—"}</td>
                        <td>{row.VALTODAY != null ? formatNum(row.VALTODAY) : "—"}</td>
                        <td>{row.NUMTRADES != null ? row.NUMTRADES.toLocaleString("ru-RU") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {mainTab === "Фьючерсы" && (
            <>
              <div className={styles.cards}>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>КОНТРАКТОВ</span>
                  <span className={styles.cardValue}>{futuresData?.futures.length ?? 0}</span>
                </div>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>ОБОРОТ</span>
                  <span className={styles.cardValue}>
                    {futuresData ? formatNum(futuresData.totalTurnover) : "—"}
                  </span>
                </div>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>СДЕЛОК</span>
                  <span className={styles.cardValue}>
                    {futuresData?.totalTrades != null ? futuresData.totalTrades.toLocaleString("ru-RU") : "—"}
                  </span>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ТИКЕР</th>
                      <th>НАЗВАНИЕ</th>
                      <th>ЦЕНА</th>
                      <th>ИЗМ.%</th>
                      <th>ОТКР. ПОЗИЦИЯ</th>
                      <th>ОБОРОТ</th>
                      <th>СДЕЛКИ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(futuresData?.futures ?? []).slice(0, 80).map((row) => (
                      <tr key={row.SECID}>
                        <td className={styles.ticker}>{row.SECID}</td>
                        <td>{row.SHORTNAME}</td>
                        <td>{row.LAST != null ? row.LAST.toFixed(2) : "—"}</td>
                        <td>
                          {row.LASTCHANGEPRCNT != null ? (
                            <span className={row.LASTCHANGEPRCNT >= 0 ? styles.positive : styles.negative}>
                              {row.LASTCHANGEPRCNT >= 0 ? "+" : ""}{row.LASTCHANGEPRCNT.toFixed(2)}%
                            </span>
                          ) : "—"}
                        </td>
                        <td>{row.OPENPOSITION != null ? row.OPENPOSITION.toLocaleString("ru-RU") : "—"}</td>
                        <td>{row.VALTODAY != null ? formatNum(row.VALTODAY) : "—"}</td>
                        <td>{row.NUMTRADES != null ? row.NUMTRADES.toLocaleString("ru-RU") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {mainTab === "Стратегии" && (
            <div className={styles.placeholder}>
              <p>Стратегии и структурные продукты. Данные MOEX.</p>
              <a href="https://www.moex.com/ru/markets/stock/" target="_blank" rel="noopener noreferrer">Мосбиржа — Рынок акций</a>
            </div>
          )}

          {mainTab === "Арбитраж & RV" && (
            <div className={styles.placeholder}>
              <p>Арбитраж и относительная стоимость (RV). Аналитика на основе котировок MOEX.</p>
              <a href="https://www.moex.com/ru/derivatives/" target="_blank" rel="noopener noreferrer">Мосбиржа — Срочный рынок</a>
            </div>
          )}

          {mainTab === "Фонды" && (
            <div className={styles.placeholder}>
              <p>Биржевые фонды (ETF) и ПИФы. Данные с Мосбиржи.</p>
              <a href="https://www.moex.com/ru/markets/stock/shares/" target="_blank" rel="noopener noreferrer">Мосбиржа — Фонды</a>
            </div>
          )}

          {mainTab === "Макро" && (
            <div className={styles.macroBlock}>
              <div className={styles.cards}>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>IMOEX</span>
                  <span className={styles.cardValue}>
                    {indices.find((i) => i.SECID === "IMOEX")?.LAST ?? "—"}
                  </span>
                </div>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>RTSI</span>
                  <span className={styles.cardValue}>
                    {indices.find((i) => i.SECID === "RTSI")?.LAST ?? "—"}
                  </span>
                </div>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>USDRUB</span>
                  <span className={styles.cardValue}>{currency.USDRUB != null ? currency.USDRUB.toFixed(2) : "—"}</span>
                </div>
                <div className={styles.card}>
                  <span className={styles.cardLabel}>Ключевая ставка ЦБ</span>
                  <span className={styles.cardValue}>
                    {keyRate.keyRate != null ? `${keyRate.keyRate}%` : "—"}
                    {keyRate.keyRateDate && <span className={styles.cardHint}> с {keyRate.keyRateDate}</span>}
                  </span>
                </div>
              </div>
              <p className={styles.macroSource}>Источники: MOEX ISS, Банк России</p>
            </div>
          )}

          {mainTab === "Календарь" && (
            <div className={styles.calendarBlock}>
              <h3 className={styles.calendarTitle}>Заседания Совета директоров Банка России</h3>
              <ul className={styles.calendarList}>
                {calendarEvents.map((e) => (
                  <li key={e.date} className={styles.calendarItem}>
                    <span className={styles.calendarDate}>{e.date}</span>
                    <span>{e.title}</span>
                  </li>
                ))}
              </ul>
              {calendarEvents.length === 0 && <p className={styles.placeholder}>Загрузка календаря…</p>}
            </div>
          )}

          {mainTab === "Аналитика" && (
            <div className={styles.placeholder}>
              <p>Аналитика и отчёты. Данные MOEX, отчётность эмитентов.</p>
              <a href="https://www.moex.com/ru/listing/" target="_blank" rel="noopener noreferrer">Мосбиржа — Листинг</a>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
