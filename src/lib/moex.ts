const ISS_BASE = "https://iss.moex.com/iss";

export type IndexRow = {
  SECID: string;
  SHORTNAME: string;
  OPEN: number | null;
  LAST: number | null;
  LASTCHANGEPRCNT: number | null;
  UPDATETIME: string | null;
};

export type StockRow = {
  SECID: string;
  SHORTNAME: string;
  SECNAME: string;
  SECTORID: string | null;
  SECTYPE: string | null;
  LAST: number | null;
  LASTCHANGEPRCNT: number | null;
  WAPRICE: number | null;
  NUMTRADES: number | null;
  VALTODAY: number | null;
  VOLTODAY: number | null;
};

export type IndicesResponse = {
  indices: IndexRow[];
  updateTime: string | null;
};

export type StocksResponse = {
  stocks: StockRow[];
  totalTickers: number;
  totalTurnover: number;
  totalTrades: number;
  updateTime: string | null;
};

function parseISS<T>(data: unknown, blockName: string): { columns: string[]; data: unknown[][] } | null {
  const block = (data as Record<string, unknown>)?.[blockName] as { columns: string[]; data: unknown[][] } | undefined;
  return block ?? null;
}

function rowToObject<T extends Record<string, unknown>>(columns: string[], row: unknown[]): T {
  const obj: Record<string, unknown> = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });
  return obj as T;
}

export async function fetchIndices(): Promise<IndicesResponse> {
  const url = `${ISS_BASE}/engines/stock/markets/index/boards/SNDX/securities.json?securities=IMOEX,RTSI&iss.meta=off&iss.only=marketdata`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("MOEX indices fetch failed");
  const data = await res.json();
  const block = parseISS(data, "marketdata");
  const indices: IndexRow[] = [];
  let updateTime: string | null = null;
  if (block) {
    block.data.forEach((row) => {
      const o = rowToObject<Record<string, unknown>>(block.columns, row);
      const lastVal = o.CURRENTVALUE ?? o.LASTVALUE ?? o.LAST;
      indices.push({
        SECID: String(o.SECID ?? ""),
        SHORTNAME: String(o.SECID ?? ""),
        OPEN: (o.OPENVALUE ?? o.OPEN) != null ? Number(o.OPENVALUE ?? o.OPEN) : null,
        LAST: lastVal != null ? Number(lastVal) : null,
        LASTCHANGEPRCNT: (o.LASTCHANGEPRC ?? o.LASTCHANGEPRCNT) != null ? Number(o.LASTCHANGEPRC ?? o.LASTCHANGEPRCNT) : null,
        UPDATETIME: o.UPDATETIME != null ? String(o.UPDATETIME) : null
      });
    });
    const first = block.data[0];
    if (first && block.columns.includes("UPDATETIME")) {
      const i = block.columns.indexOf("UPDATETIME");
      updateTime = first[i] != null ? String(first[i]) : null;
    }
  }
  return { indices, updateTime };
}

export async function fetchStocks(start: number = 0): Promise<StocksResponse> {
  const url = `${ISS_BASE}/engines/stock/markets/shares/boards/TQBR/securities.json?iss.meta=off&iss.only=securities,marketdata&start=${start}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("MOEX stocks fetch failed");
  const data = await res.json();
  const secBlock = parseISS(data, "securities");
  const mdBlock = parseISS(data, "marketdata");
  const stocks: StockRow[] = [];
  let updateTime: string | null = null;
  const secCols = secBlock?.columns ?? [];
  const mdCols = mdBlock?.columns ?? [];
  const secIdx = (name: string) => secCols.indexOf(name);
  const mdIdx = (name: string) => mdCols.indexOf(name);
  const n = Math.min(secBlock?.data?.length ?? 0, mdBlock?.data?.length ?? 0);
  let totalTurnover = 0;
  let totalTrades = 0;
  for (let i = 0; i < n; i++) {
    const sRow = secBlock!.data[i];
    const mRow = mdBlock!.data[i];
    const getS = (key: string) => (secIdx(key) >= 0 ? sRow[secIdx(key)] : undefined);
    const getM = (key: string) => (mdIdx(key) >= 0 ? mRow[mdIdx(key)] : undefined);
    const last = getM("LAST") != null ? Number(getM("LAST")) : null;
    const valToday = getM("VALTODAY") != null ? Number(getM("VALTODAY")) : null;
    const numTrades = getM("NUMTRADES") != null ? Number(getM("NUMTRADES")) : null;
    if (valToday != null) totalTurnover += valToday;
    if (numTrades != null) totalTrades += numTrades;
    if (i === 0 && getM("UPDATETIME")) updateTime = String(getM("UPDATETIME"));
    stocks.push({
      SECID: String(getS("SECID") ?? getM("SECID") ?? ""),
      SHORTNAME: String(getS("SHORTNAME") ?? ""),
      SECNAME: String(getS("SECNAME") ?? ""),
      SECTORID: getS("SECTORID") != null ? String(getS("SECTORID")) : null,
      SECTYPE: getS("SECTYPE") != null ? String(getS("SECTYPE")) : null,
      LAST: last,
      LASTCHANGEPRCNT: getM("LASTCHANGEPRCNT") != null ? Number(getM("LASTCHANGEPRCNT")) : null,
      WAPRICE: getM("WAPRICE") != null ? Number(getM("WAPRICE")) : null,
      NUMTRADES: numTrades,
      VALTODAY: valToday,
      VOLTODAY: getM("VOLTODAY") != null ? Number(getM("VOLTODAY")) : null
    });
  }
  return {
    stocks,
    totalTickers: stocks.length,
    totalTurnover,
    totalTrades,
    updateTime
  };
}

export type BondRow = {
  SECID: string;
  SHORTNAME: string;
  LAST: number | null;
  LASTCHANGEPRCNT: number | null;
  YIELD: number | null;
  VALTODAY: number | null;
  NUMTRADES: number | null;
};

export type FuturesRow = {
  SECID: string;
  SHORTNAME: string;
  LAST: number | null;
  LASTCHANGEPRCNT: number | null;
  OPENPOSITION: number | null;
  VALTODAY: number | null;
  NUMTRADES: number | null;
};

export async function fetchBonds(start: number = 0): Promise<{ bonds: BondRow[]; totalTurnover: number; totalTrades: number }> {
  const url = `${ISS_BASE}/engines/stock/markets/bonds/boards/TQOB/securities.json?iss.meta=off&iss.only=securities,marketdata&start=${start}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { bonds: [], totalTurnover: 0, totalTrades: 0 };
    const data = await res.json();
    const secBlock = parseISS(data, "securities");
    const mdBlock = parseISS(data, "marketdata");
    const bonds: BondRow[] = [];
    let totalTurnover = 0, totalTrades = 0;
    const secCols = secBlock?.columns ?? [];
    const mdCols = mdBlock?.columns ?? [];
    const n = Math.min(secBlock?.data?.length ?? 0, mdBlock?.data?.length ?? 0);
    for (let i = 0; i < n; i++) {
      const sRow = secBlock!.data[i];
      const mRow = mdBlock!.data[i];
      const getS = (k: string) => (secCols.indexOf(k) >= 0 ? sRow[secCols.indexOf(k)] : undefined);
      const getM = (k: string) => (mdCols.indexOf(k) >= 0 ? mRow[mdCols.indexOf(k)] : undefined);
      const val = getM("VALTODAY") != null ? Number(getM("VALTODAY")) : null;
      const num = getM("NUMTRADES") != null ? Number(getM("NUMTRADES")) : null;
      if (val != null) totalTurnover += val;
      if (num != null) totalTrades += num;
      bonds.push({
        SECID: String(getS("SECID") ?? getM("SECID") ?? ""),
        SHORTNAME: String(getS("SHORTNAME") ?? ""),
        LAST: getM("LAST") != null ? Number(getM("LAST")) : null,
        LASTCHANGEPRCNT: getM("LASTCHANGEPRCNT") != null ? Number(getM("LASTCHANGEPRCNT")) : null,
        YIELD: getM("YIELDTOOFFER") != null ? Number(getM("YIELDTOOFFER")) : (getM("YIELDLASTCOUPON") != null ? Number(getM("YIELDLASTCOUPON")) : null),
        VALTODAY: val,
        NUMTRADES: num
      });
    }
    return { bonds, totalTurnover, totalTrades };
  } catch {
    return { bonds: [], totalTurnover: 0, totalTrades: 0 };
  }
}

export async function fetchFutures(start: number = 0): Promise<{ futures: FuturesRow[]; totalTurnover: number; totalTrades: number }> {
  const url = `${ISS_BASE}/engines/futures/markets/forts/boards/RFUD/securities.json?iss.meta=off&iss.only=securities,marketdata&start=${start}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { futures: [], totalTurnover: 0, totalTrades: 0 };
    const data = await res.json();
    const secBlock = parseISS(data, "securities");
    const mdBlock = parseISS(data, "marketdata");
    const futures: FuturesRow[] = [];
    let totalTurnover = 0, totalTrades = 0;
    const secCols = secBlock?.columns ?? [];
    const mdCols = mdBlock?.columns ?? [];
    const n = Math.min(secBlock?.data?.length ?? 0, mdBlock?.data?.length ?? 0);
    for (let i = 0; i < n; i++) {
      const sRow = secBlock!.data[i];
      const mRow = mdBlock!.data[i];
      const getS = (k: string) => (secCols.indexOf(k) >= 0 ? sRow[secCols.indexOf(k)] : undefined);
      const getM = (k: string) => (mdCols.indexOf(k) >= 0 ? mRow[mdCols.indexOf(k)] : undefined);
      const val = getM("VALTODAY") != null ? Number(getM("VALTODAY")) : null;
      const num = getM("NUMTRADES") != null ? Number(getM("NUMTRADES")) : null;
      if (val != null) totalTurnover += val;
      if (num != null) totalTrades += num;
      futures.push({
        SECID: String(getS("SECID") ?? getM("SECID") ?? ""),
        SHORTNAME: String(getS("SHORTNAME") ?? ""),
        LAST: getM("LAST") != null ? Number(getM("LAST")) : null,
        LASTCHANGEPRCNT: getM("LASTCHANGEPRCNT") != null ? Number(getM("LASTCHANGEPRCNT")) : null,
        OPENPOSITION: getM("OPENPOSITION") != null ? Number(getM("OPENPOSITION")) : null,
        VALTODAY: val,
        NUMTRADES: num
      });
    }
    return { futures, totalTurnover, totalTrades };
  } catch {
    return { futures: [], totalTurnover: 0, totalTrades: 0 };
  }
}

export async function fetchCurrency(): Promise<{ USDRUB: number | null; CNYRUB: number | null }> {
  // CETS: USD/RUB TOM = USD000UTSTOM, CNY/RUB TOM = CNYRUB_TOM (реальные тикеры с котировками)
  const url = `${ISS_BASE}/engines/currency/markets/selt/boards/CETS/securities.json?securities=USD000UTSTOM,CNYRUB_TOM&iss.meta=off&iss.only=marketdata`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { USDRUB: null, CNYRUB: null };
    const data = await res.json();
    const block = parseISS(data, "marketdata");
    let USDRUB: number | null = null;
    let CNYRUB: number | null = null;
    if (block) {
      const idxLast = block.columns.indexOf("LAST");
      const idxSec = block.columns.indexOf("SECID");
      block.data.forEach((row) => {
        const sec = idxSec >= 0 ? String(row[idxSec]) : "";
        const last = idxLast >= 0 && row[idxLast] != null ? Number(row[idxLast]) : null;
        if (sec === "USD000UTSTOM") USDRUB = last;
        if (sec === "CNYRUB_TOM") CNYRUB = last;
      });
    }
    return { USDRUB, CNYRUB };
  } catch {
    return { USDRUB: null, CNYRUB: null };
  }
}
