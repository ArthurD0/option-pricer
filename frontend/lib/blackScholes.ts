function normCdf(x: number): number {
  const a = 0.3275911;
  const b = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + a * Math.abs(x));
  const poly = b.reduce((acc, bi) => acc * t + bi, 0) * t;
  return 0.5 * (1 + sign * (1 - poly * Math.exp(-x * x / 2)));
}

function normPdf(x: number): number {
  return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
}

function d1(S: number, K: number, T: number, r: number, sigma: number) {
  return (Math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * Math.sqrt(T));
}

function d2(d1val: number, sigma: number, T: number) {
  return d1val - sigma * Math.sqrt(T);
}

export type OptionResult = {
  price: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
};

export function price(
  S: number, K: number, T: number, r: number, sigma: number,
  type: "call" | "put"
): OptionResult {
  const _d1 = d1(S, K, T, r, sigma);
  const _d2 = d2(_d1, sigma, T);
  const disc = Math.exp(-r * T);
  const sqrtT = Math.sqrt(T);

  const callPrice = S * normCdf(_d1) - K * disc * normCdf(_d2);

  return {
    price:  type === "call" ? callPrice : callPrice - S + K * disc,
    delta:  type === "call" ? normCdf(_d1) : normCdf(_d1) - 1,
    gamma:  normPdf(_d1) / (S * sigma * sqrtT),
    vega:   S * sqrtT * normPdf(_d1) / 100,
    theta:  ((-S * normPdf(_d1) * sigma / (2 * sqrtT))
              + (type === "call" ? -1 : 1) * r * K * disc * normCdf(type === "call" ? _d2 : -_d2)) / 365,
    rho:    (type === "call" ? 1 : -1) * K * T * disc * normCdf(type === "call" ? _d2 : -_d2) / 100,
  };
}
