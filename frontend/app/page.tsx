"use client";

import { useState } from "react";
import { price as bsCompute, type OptionResult } from "@/lib/blackScholes";
import { crrPrice } from "@/lib/binomial";
import { mcPrice, type MCResult } from "@/lib/monteCarlo";

const API = "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────────────────────────

type Results = { bs: OptionResult; crr: number; mc: MCResult };

type ChainRow = {
  strike: number;
  market_price: number;
  impl_vol_pct: number | null;
  bs_price: number | null;
  bs_vs_market: number | null;
  volume: number;
  openInterest: number;
};

type ChainData = {
  ticker: string; spot: number; expiry: string;
  T: number; r: number; type: string; rows: ChainRow[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  S: 100, K: 100, T: 1, r: 0.05, sigma: 0.20,
  optionType: "call" as "call" | "put",
  american: false, nSteps: 200, nPaths: 50_000,
};

const GREEKS = [
  { key: "delta", label: "Delta", unit: "Δ", desc: "∂V/∂S" },
  { key: "gamma", label: "Gamma", unit: "Γ", desc: "∂²V/∂S²" },
  { key: "vega",  label: "Vega",  unit: "ν", desc: "∂V/∂σ  per 1% vol" },
  { key: "theta", label: "Theta", unit: "Θ", desc: "∂V/∂t  per day" },
  { key: "rho",   label: "Rho",   unit: "ρ", desc: "∂V/∂r  per 1% rate" },
] as const;

// ─── Main ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [tab, setTab] = useState<"pricer" | "live">("pricer");

  return (
    <div className="min-h-screen bg-[#f9f9f8] text-[#111110] font-[family-name:var(--font-geist-sans)]">
      <header className="border-b border-[#e5e5e3] px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-[0.15em] uppercase text-[#555]">Option Pricer</span>
          <span className="text-[#ddd]">·</span>
          <span className="text-xs text-[#999]">Black-Scholes · CRR · Monte Carlo</span>
        </div>
        <div className="flex border border-[#e5e5e3] rounded overflow-hidden">
          {(["pricer", "live"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                tab === t ? "bg-[#111110] text-white" : "bg-white text-[#666] hover:bg-[#f3f3f2]"
              }`}>
              {t === "pricer" ? "Pricer" : "Live Chain"}
            </button>
          ))}
        </div>
      </header>

      {tab === "pricer" ? <PricerTab /> : <LiveTab />}
    </div>
  );
}

// ─── Tab 1: Pricer ───────────────────────────────────────────────────────────

function PricerTab() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [results, setResults] = useState<Results | null>(null);

  const set = (name: string, value: string | boolean | number) =>
    setForm((f) => ({ ...f, [name]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { S, K, T, r, sigma, optionType, american, nSteps, nPaths } = form;
    setResults({
      bs:  bsCompute(S, K, T, r, sigma, optionType),
      crr: crrPrice(S, K, T, r, sigma, optionType, american, nSteps),
      mc:  mcPrice(S, K, T, r, sigma, optionType, nPaths),
    });
  };

  const moneyness = form.S > form.K * 1.02 ? "ITM" : form.S < form.K * 0.98 ? "OTM" : "ATM";

  return (
    <div className="max-w-6xl mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10">
      <form onSubmit={submit} className="space-y-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#888]">Parameters</p>

        <div>
          <label className="block text-xs text-[#999] mb-1.5">Type</label>
          <div className="flex border border-[#e5e5e3] rounded overflow-hidden w-fit">
            {(["call", "put"] as const).map((t) => (
              <button key={t} type="button" onClick={() => set("optionType", t)}
                className={`px-5 py-1.5 text-sm font-medium transition-colors ${
                  form.optionType === t ? "bg-[#111110] text-white" : "bg-white text-[#666] hover:bg-[#f3f3f2]"
                }`}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-[#999] mb-1.5">Exercise</label>
          <div className="flex border border-[#e5e5e3] rounded overflow-hidden w-fit">
            {([["European", false], ["American", true]] as const).map(([label, val]) => (
              <button key={label} type="button" onClick={() => set("american", val)}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                  form.american === val ? "bg-[#111110] text-white" : "bg-white text-[#666] hover:bg-[#f3f3f2]"
                }`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#ebebea]" />

        {([
          { name: "S",     label: "Spot",          hint: "S", step: "0.5",   suffix: "$" },
          { name: "K",     label: "Strike",         hint: "K", step: "0.5",   suffix: "$" },
          { name: "T",     label: "Maturity",       hint: "T", step: "0.01",  suffix: "yr" },
          { name: "r",     label: "Risk-free rate", hint: "r", step: "0.001", suffix: "%" },
          { name: "sigma", label: "Volatility",     hint: "σ", step: "0.01",  suffix: "%" },
        ] as const).map(({ name, label, hint, step, suffix }) => (
          <div key={name}>
            <label className="flex justify-between text-xs text-[#999] mb-1.5">
              <span>{label}</span>
              <span className="font-[family-name:var(--font-geist-mono)] text-[#bbb]">{hint}</span>
            </label>
            <div className="flex border border-[#e5e5e3] rounded bg-white focus-within:border-[#aaa] transition-colors">
              <input type="number" name={name} value={form[name] as number}
                onChange={(e) => set(name, parseFloat(e.target.value))}
                step={step} required
                className="flex-1 px-3 py-2 text-sm bg-transparent outline-none" />
              <span className="px-3 text-xs text-[#aaa] border-l border-[#e5e5e3] py-2 bg-[#fafaf9]">{suffix}</span>
            </div>
          </div>
        ))}

        <div className="border-t border-[#ebebea]" />

        {([
          { name: "nSteps", label: "CRR steps", hint: "N", min: 10,   max: 1000,   step: 10 },
          { name: "nPaths", label: "MC paths",   hint: "n", min: 1000, max: 500000, step: 1000 },
        ] as const).map(({ name, label, hint, min, max, step }) => (
          <div key={name}>
            <label className="flex justify-between text-xs text-[#999] mb-1.5">
              <span>{label}</span>
              <span className="font-[family-name:var(--font-geist-mono)] text-[#bbb]">{hint}</span>
            </label>
            <div className="flex border border-[#e5e5e3] rounded bg-white focus-within:border-[#aaa] transition-colors">
              <input type="number" value={form[name]}
                onChange={(e) => set(name, parseInt(e.target.value))}
                min={min} max={max} step={step}
                className="flex-1 px-3 py-2 text-sm bg-transparent outline-none" />
            </div>
          </div>
        ))}

        <button type="submit"
          className="w-full bg-[#111110] text-white text-sm font-medium py-2.5 rounded hover:bg-[#2a2a28] transition-colors">
          Compute
        </button>
      </form>

      <div className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#888]">Results</p>

        {!results && (
          <div className="border border-dashed border-[#ddd] rounded-lg h-48 flex items-center justify-center text-sm text-[#bbb]">
            No data yet
          </div>
        )}

        {results && (<>
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-[#e5e5e3] rounded-lg bg-white px-5 py-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-[#888]">Black-Scholes</p>
                {!form.american && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f3f3f2] text-[#666]">{moneyness}</span>}
              </div>
              {form.american ? (
                <><p className="text-lg font-medium text-[#bbb]">N/A</p><p className="text-xs text-[#bbb] mt-1">European only</p></>
              ) : (
                <><p className="text-2xl font-semibold font-[family-name:var(--font-geist-mono)] tracking-tight">{results.bs.price.toFixed(4)}</p><p className="text-xs text-[#bbb] mt-1">Closed-form</p></>
              )}
            </div>

            <div className="border border-[#e5e5e3] rounded-lg bg-white px-5 py-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-[#888]">Binomial CRR</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f3f3f2] text-[#666]">{form.american ? "American" : "European"}</span>
              </div>
              <p className="text-2xl font-semibold font-[family-name:var(--font-geist-mono)] tracking-tight">{results.crr.toFixed(4)}</p>
              <p className="text-xs text-[#bbb] mt-1">{form.nSteps} steps</p>
            </div>

            <div className="border border-[#e5e5e3] rounded-lg bg-white px-5 py-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-[#888]">Monte Carlo</p>
                {form.american && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#fff3cd] text-[#856404]">European only</span>}
              </div>
              <p className="text-2xl font-semibold font-[family-name:var(--font-geist-mono)] tracking-tight">{results.mc.price.toFixed(4)}</p>
              <p className="text-xs text-[#bbb] mt-1">{(form.nPaths / 1000).toFixed(0)}k paths</p>
            </div>
          </div>

          <div className="border border-[#e5e5e3] rounded-lg bg-white px-5 py-3 flex items-center gap-5 text-sm">
            <span className="text-xs text-[#888] uppercase tracking-wider shrink-0">MC 95% CI</span>
            <div className="flex-1 relative h-1 bg-[#ebebea] rounded-full">
              {(() => {
                const { ciLow, ciHigh } = results.mc;
                const bsPct = Math.min(Math.max(((results.bs.price - ciLow) / (ciHigh - ciLow)) * 100, 0), 100);
                return <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#111110]" style={{ left: `calc(${bsPct}% - 4px)` }} />;
              })()}
            </div>
            <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[#888] shrink-0">[{results.mc.ciLow.toFixed(3)}, {results.mc.ciHigh.toFixed(3)}]</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[#bbb] shrink-0">σ={results.mc.stderr.toFixed(4)}</span>
          </div>

          <div className="border border-[#e5e5e3] rounded-lg bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-[#f0f0ee] flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#888]">Greeks</span>
              <span className="text-xs text-[#bbb]">Black-Scholes · analytical</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f0f0ee]">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-[#888] uppercase tracking-wider">Greek</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[#888] uppercase tracking-wider hidden sm:table-cell">Def.</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-[#888] uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody>
                {GREEKS.map(({ key, label, unit, desc }, i) => {
                  const val = results.bs[key as keyof OptionResult] as number;
                  return (
                    <tr key={key} className={`${i < GREEKS.length - 1 ? "border-b border-[#f7f7f6]" : ""} hover:bg-[#fafaf9] transition-colors`}>
                      <td className="px-5 py-3 font-medium">{label} <span className="text-[#bbb] font-[family-name:var(--font-geist-mono)] text-xs ml-1">{unit}</span></td>
                      <td className="px-4 py-3 text-[#999] font-[family-name:var(--font-geist-mono)] text-xs hidden sm:table-cell">{desc}</td>
                      <td className={`px-5 py-3 text-right font-[family-name:var(--font-geist-mono)] font-medium tabular-nums ${val < 0 ? "text-[#c0392b]" : "text-[#111110]"}`}>
                        {val.toFixed(6)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ─── Tab 2: Live Chain ───────────────────────────────────────────────────────

function LiveTab() {
  const [ticker, setTicker]       = useState("AAPL");
  const [optionType, setOptionType] = useState<"call" | "put">("call");
  const [expirations, setExpirations] = useState<string[]>([]);
  const [expiry, setExpiry]       = useState("");
  const [spot, setSpot]           = useState<number | null>(null);
  const [chain, setChain]         = useState<ChainData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const loadExpirations = async () => {
    setLoading(true); setError(null); setChain(null); setExpirations([]);
    try {
      const res = await fetch(`${API}/expirations/${ticker}`);
      if (!res.ok) throw new Error((await res.json()).detail);
      const data = await res.json();
      setExpirations(data.expirations);
      setSpot(data.spot);
      setExpiry(data.expirations[0] ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  };

  const loadChain = async () => {
    if (!expiry) return;
    setLoading(true); setError(null); setChain(null);
    try {
      const res = await fetch(`${API}/chain/${ticker}?expiry=${expiry}&option_type=${optionType}&min_volume=5`);
      if (!res.ok) throw new Error((await res.json()).detail);
      setChain(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  };

  const moneyness = (strike: number) => {
    if (!spot) return "";
    if (optionType === "call") return strike < spot * 0.98 ? "ITM" : strike > spot * 1.02 ? "OTM" : "ATM";
    return strike > spot * 1.02 ? "ITM" : strike < spot * 0.98 ? "OTM" : "ATM";
  };

  const moneynessColor = (m: string) =>
    m === "ITM" ? "text-[#1a7f37]" : m === "OTM" ? "text-[#888]" : "text-[#0969da]";

  return (
    <div className="max-w-6xl mx-auto px-8 py-10 space-y-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#888]">Live Options Chain</p>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-[#999] mb-1.5">Ticker</label>
          <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && loadExpirations()}
            placeholder="AAPL"
            className="border border-[#e5e5e3] rounded bg-white px-3 py-2 text-sm w-28 outline-none focus:border-[#aaa] uppercase" />
        </div>

        <div>
          <label className="block text-xs text-[#999] mb-1.5">Type</label>
          <div className="flex border border-[#e5e5e3] rounded overflow-hidden">
            {(["call", "put"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setOptionType(t)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  optionType === t ? "bg-[#111110] text-white" : "bg-white text-[#666] hover:bg-[#f3f3f2]"
                }`}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
        </div>

        <button onClick={loadExpirations} disabled={loading}
          className="px-4 py-2 bg-[#111110] text-white text-sm font-medium rounded hover:bg-[#2a2a28] transition-colors disabled:opacity-50">
          Load
        </button>

        {expirations.length > 0 && (<>
          <div>
            <label className="block text-xs text-[#999] mb-1.5">Expiry</label>
            <select value={expiry} onChange={(e) => setExpiry(e.target.value)}
              className="border border-[#e5e5e3] rounded bg-white px-3 py-2 text-sm outline-none focus:border-[#aaa]">
              {expirations.map((e) => <option key={e}>{e}</option>)}
            </select>
          </div>
          <button onClick={loadChain} disabled={loading}
            className="px-4 py-2 border border-[#e5e5e3] bg-white text-[#111110] text-sm font-medium rounded hover:bg-[#f3f3f2] transition-colors disabled:opacity-50">
            Fetch Chain
          </button>
        </>)}
      </div>

      {loading && <p className="text-sm text-[#888]">Fetching…</p>}
      {error   && <div className="border border-[#fca5a5] bg-[#fef2f2] text-[#b91c1c] rounded-lg px-4 py-3 text-sm">{error}</div>}

      {/* Chain info bar */}
      {chain && (
        <div className="flex gap-6 text-xs text-[#888] font-[family-name:var(--font-geist-mono)]">
          <span><span className="text-[#111110] font-semibold">{chain.ticker}</span></span>
          <span>Spot <span className="text-[#111110]">${chain.spot}</span></span>
          <span>Expiry <span className="text-[#111110]">{chain.expiry}</span></span>
          <span>T <span className="text-[#111110]">{chain.T.toFixed(3)}y</span></span>
          <span>r <span className="text-[#111110]">{(chain.r * 100).toFixed(2)}%</span></span>
          <span>{chain.rows.length} strikes</span>
        </div>
      )}

      {/* Chain table */}
      {chain && (
        <div className="border border-[#e5e5e3] rounded-lg bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e5e3] bg-[#fafaf9]">
                {["Strike", "Mkt Price", "Impl. Vol", "BS Price", "BS − Mkt", "Volume", "OI", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chain.rows.map((row, i) => {
                const m = moneyness(row.strike);
                const err = row.bs_vs_market;
                return (
                  <tr key={i} className={`${i < chain.rows.length - 1 ? "border-b border-[#f7f7f6]" : ""} hover:bg-[#fafaf9] transition-colors`}>
                    <td className="px-4 py-2.5 font-[family-name:var(--font-geist-mono)] font-medium">{row.strike.toFixed(1)}</td>
                    <td className="px-4 py-2.5 font-[family-name:var(--font-geist-mono)]">{row.market_price.toFixed(4)}</td>
                    <td className="px-4 py-2.5 font-[family-name:var(--font-geist-mono)] font-medium">
                      {(row as unknown as Record<string, number>)["impl_vol_%"] != null
                        ? `${((row as unknown as Record<string, number>)["impl_vol_%"]).toFixed(1)}%`
                        : <span className="text-[#ccc]">—</span>}
                    </td>
                    <td className="px-4 py-2.5 font-[family-name:var(--font-geist-mono)] text-[#555]">
                      {row.bs_price != null ? row.bs_price.toFixed(4) : <span className="text-[#ccc]">—</span>}
                    </td>
                    <td className={`px-4 py-2.5 font-[family-name:var(--font-geist-mono)] ${err != null && err < 0 ? "text-[#c0392b]" : "text-[#555]"}`}>
                      {err != null ? (err >= 0 ? "+" : "") + err.toFixed(4) : <span className="text-[#ccc]">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-[#888] font-[family-name:var(--font-geist-mono)]">{row.volume?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-[#bbb] font-[family-name:var(--font-geist-mono)]">{row.openInterest?.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium ${moneynessColor(m)}`}>{m}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
