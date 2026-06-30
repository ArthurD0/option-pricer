export function crrPrice(
  S: number, K: number, T: number, r: number, sigma: number,
  optionType: "call" | "put",
  american: boolean = false,
  N: number = 200,
): number {
  const dt = T / N;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const disc = Math.exp(-r * dt);
  const p = (Math.exp(r * dt) - d) / (u - d);
  const q = 1 - p;

  // Terminal payoffs
  const V = new Float64Array(N + 1);
  for (let j = 0; j <= N; j++) {
    const ST = S * Math.pow(u, j) * Math.pow(d, N - j);
    V[j] = optionType === "call" ? Math.max(ST - K, 0) : Math.max(K - ST, 0);
  }

  // Backward induction
  for (let i = N - 1; i >= 0; i--) {
    for (let j = 0; j <= i; j++) {
      V[j] = disc * (p * V[j + 1] + q * V[j]);
      if (american) {
        const Snode = S * Math.pow(u, j) * Math.pow(d, i - j);
        const intrinsic = optionType === "call" ? Math.max(Snode - K, 0) : Math.max(K - Snode, 0);
        V[j] = Math.max(V[j], intrinsic);
      }
    }
  }

  return V[0];
}
