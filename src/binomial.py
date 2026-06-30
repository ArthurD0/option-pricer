"""Binomial tree pricer (Cox-Ross-Rubinstein) — European and American options."""

import math
import numpy as np


def crr_price(
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    option_type: str = "call",
    american: bool = False,
    N: int = 200,
) -> float:
    """
    Price a European or American option using the CRR binomial tree.

    Parameters
    ----------
    S           : spot price
    K           : strike price
    T           : time to maturity in years
    r           : continuous risk-free rate
    sigma       : annualised volatility
    option_type : "call" or "put"
    american    : True for American-style early exercise
    N           : number of time steps (more steps = more accurate)
    """
    if option_type not in ("call", "put"):
        raise ValueError(f"option_type must be 'call' or 'put', got '{option_type}'")

    dt = T / N

    # CRR parameters
    u = math.exp(sigma * math.sqrt(dt))
    d = 1.0 / u
    disc = math.exp(-r * dt)
    p = (math.exp(r * dt) - d) / (u - d)   # risk-neutral probability
    q = 1.0 - p

    # ── Pass 1: terminal asset prices and payoffs ──
    # j=0 → all down, j=N → all up
    j = np.arange(N + 1)
    S_T = S * (u ** j) * (d ** (N - j))

    if option_type == "call":
        V = np.maximum(S_T - K, 0.0)
    else:
        V = np.maximum(K - S_T, 0.0)

    # ── Pass 2: backward induction ──
    for i in range(N - 1, -1, -1):
        # Roll back one step: V[j] comes from V[j+1] (up) and V[j] (down)
        V = disc * (p * V[1:] + q * V[:-1])

        if american:
            # Asset prices at this earlier node
            j = np.arange(i + 1)
            S_node = S * (u ** j) * (d ** (i - j))
            intrinsic = np.maximum(S_node - K, 0.0) if option_type == "call" else np.maximum(K - S_node, 0.0)
            V = np.maximum(V, intrinsic)

    return float(V[0])
