export type MCResult = {
  price: number;
  stderr: number;
  ciLow: number;
  ciHigh: number;
};

// Mulberry32 — fast seedable PRNG
function makePrng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Box-Muller: uniform pair → standard normal
function boxMuller(u1: number, u2: number): number {
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function mcPrice(
  S: number, K: number, T: number, r: number, sigma: number,
  optionType: "call" | "put",
  nPaths: number = 50_000,
  seed: number = 42,
): MCResult {
  const rand = makePrng(seed);
  const drift = (r - 0.5 * sigma * sigma) * T;
  const vol = sigma * Math.sqrt(T);
  const disc = Math.exp(-r * T);

  const payoffs = new Float64Array(nPaths);

  for (let i = 0; i < nPaths; i++) {
    const Z = boxMuller(rand(), rand());
    const Sp = S * Math.exp(drift + vol * Z);
    const Sm = S * Math.exp(drift - vol * Z);
    const pp = optionType === "call" ? Math.max(Sp - K, 0) : Math.max(K - Sp, 0);
    const pm = optionType === "call" ? Math.max(Sm - K, 0) : Math.max(K - Sm, 0);
    payoffs[i] = disc * (pp + pm) / 2;
  }

  let sum = 0, sum2 = 0;
  for (let i = 0; i < nPaths; i++) { sum += payoffs[i]; sum2 += payoffs[i] ** 2; }
  const mean = sum / nPaths;
  const variance = sum2 / nPaths - mean ** 2;
  const stderr = Math.sqrt(variance / nPaths);

  return { price: mean, stderr, ciLow: mean - 1.96 * stderr, ciHigh: mean + 1.96 * stderr };
}
