"use client";

import { useState } from "react";
import { price as computePrice, type OptionResult } from "@/lib/blackScholes";

const DEFAULT = {
  S: 100,
  K: 100,
  T: 1,
  r: 0.05,
  sigma: 0.20,
  option_type: "call" as "call" | "put",
};

const GREEKS = [
  { key: "price",  label: "Price",  unit: "$",   desc: "Theoretical value" },
  { key: "delta",  label: "Delta",  unit: "Δ",   desc: "∂V/∂S" },
  { key: "gamma",  label: "Gamma",  unit: "Γ",   desc: "∂²V/∂S²" },
  { key: "vega",   label: "Vega",   unit: "ν",   desc: "∂V/∂σ  per 1% vol" },
  { key: "theta",  label: "Theta",  unit: "Θ",   desc: "∂V/∂t  per day" },
  { key: "rho",    label: "Rho",    unit: "ρ",   desc: "∂V/∂r  per 1% rate" },
] as const;

export default function Home() {
  const [form, setForm] = useState(DEFAULT);
  const [result, setResult] = useState<OptionResult | null>(null);

  const set = (name: string, value: string) =>
    setForm((f) => ({ ...f, [name]: name === "option_type" ? value : parseFloat(value) }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(computePrice(form.S, form.K, form.T, form.r, form.sigma, form.option_type));
  };

  const moneyness =
    form.S > form.K * 1.02 ? "ITM" : form.S < form.K * 0.98 ? "OTM" : "ATM";

  return (
    <div className="min-h-screen bg-[#f9f9f8] text-[#111110] font-[family-name:var(--font-geist-sans)]">

      {/* Top bar */}
      <header className="border-b border-[#e5e5e3] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-[0.15em] uppercase text-[#888]">Option Pricer</span>
          <span className="text-[#ccc]">·</span>
          <span className="text-xs text-[#888]">Black-Scholes  ·  European</span>
        </div>
        <span className="text-xs text-[#bbb] font-[family-name:var(--font-geist-mono)]">v1.0</span>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-12 grid grid-cols-1 md:grid-cols-[340px_1fr] gap-12">

        {/* ── LEFT: form ── */}
        <form onSubmit={submit} className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Parameters</h1>
            <p className="text-sm text-[#888] mt-0.5">Continuous compounding, no dividends</p>
          </div>

          {/* Option type toggle */}
          <div>
            <label className="block text-xs text-[#888] mb-2 uppercase tracking-wider">Type</label>
            <div className="flex border border-[#e5e5e3] rounded-md overflow-hidden w-fit">
              {(["call", "put"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("option_type", t)}
                  className={`px-6 py-1.5 text-sm font-medium transition-colors ${
                    form.option_type === t
                      ? "bg-[#111110] text-white"
                      : "bg-white text-[#555] hover:bg-[#f3f3f2]"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Numeric inputs */}
          {[
            { name: "S",     label: "Spot",       hint: "S",      step: "0.5",   suffix: "$" },
            { name: "K",     label: "Strike",      hint: "K",      step: "0.5",   suffix: "$" },
            { name: "T",     label: "Maturity",    hint: "T",      step: "0.01",  suffix: "yr" },
            { name: "r",     label: "Risk-free rate", hint: "r",   step: "0.001", suffix: "%" },
            { name: "sigma", label: "Volatility",  hint: "σ",      step: "0.01",  suffix: "%" },
          ].map(({ name, label, hint, step, suffix }) => (
            <div key={name}>
              <label className="flex items-center justify-between text-xs text-[#888] mb-1.5 uppercase tracking-wider">
                <span>{label}</span>
                <span className="font-[family-name:var(--font-geist-mono)] text-[#bbb] normal-case tracking-normal">{hint}</span>
              </label>
              <div className="flex items-center border border-[#e5e5e3] rounded-md overflow-hidden bg-white focus-within:border-[#999] transition-colors">
                <input
                  type="number"
                  name={name}
                  value={form[name as keyof typeof form] as number}
                  onChange={(e) => set(name, e.target.value)}
                  step={step}
                  required
                  className="flex-1 px-3 py-2 text-sm bg-transparent outline-none text-[#111110]"
                />
                <span className="px-3 text-xs text-[#aaa] border-l border-[#e5e5e3] py-2 bg-[#fafaf9]">{suffix}</span>
              </div>
            </div>
          ))}

          <button
            type="submit"
            className="w-full bg-[#111110] text-white text-sm font-medium py-2.5 rounded-md hover:bg-[#2a2a28] transition-colors"
          >
            Compute
          </button>
        </form>

        {/* ── RIGHT: results ── */}
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Results</h2>
            <p className="text-sm text-[#888] mt-0.5">
              {result
                ? `${form.option_type.charAt(0).toUpperCase() + form.option_type.slice(1)} · ${moneyness} · S=${form.S} K=${form.K} T=${form.T}y σ=${(form.sigma * 100).toFixed(0)}%`
                : "Enter parameters and click Compute"}
            </p>
          </div>

          {!result && (
            <div className="border border-dashed border-[#ddd] rounded-lg h-64 flex items-center justify-center text-sm text-[#bbb]">
              No data yet
            </div>
          )}

          {result && (
            <div className="border border-[#e5e5e3] rounded-lg overflow-hidden bg-white">
              {/* Price — highlighted */}
              <div className="px-6 py-5 border-b border-[#e5e5e3] flex items-baseline justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#888]">Theoretical Price</p>
                  <p className="text-4xl font-semibold mt-1 font-[family-name:var(--font-geist-mono)] tracking-tight">
                    {result.price.toFixed(4)}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-[#f3f3f2] text-[#555] font-medium">{moneyness}</span>
              </div>

              {/* Greeks table */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e5e3]">
                    <th className="text-left px-6 py-2.5 text-xs font-medium text-[#888] uppercase tracking-wider">Greek</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[#888] uppercase tracking-wider">Definition</th>
                    <th className="text-right px-6 py-2.5 text-xs font-medium text-[#888] uppercase tracking-wider">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {GREEKS.filter(g => g.key !== "price").map(({ key, label, unit, desc }, i) => {
                    const val = result[key as keyof OptionResult];
                    const isLast = i === GREEKS.length - 2;
                    return (
                      <tr key={key} className={`${!isLast ? "border-b border-[#f0f0ee]" : ""} hover:bg-[#fafaf9] transition-colors`}>
                        <td className="px-6 py-3 font-medium">
                          <span>{label}</span>
                          <span className="ml-2 text-[#bbb] font-[family-name:var(--font-geist-mono)] text-xs">{unit}</span>
                        </td>
                        <td className="px-4 py-3 text-[#888] font-[family-name:var(--font-geist-mono)] text-xs">{desc}</td>
                        <td className={`px-6 py-3 text-right font-[family-name:var(--font-geist-mono)] font-medium tabular-nums ${
                          val < 0 ? "text-[#c0392b]" : "text-[#111110]"
                        }`}>
                          {val.toFixed(6)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
