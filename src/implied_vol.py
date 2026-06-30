"""Implied volatility solver — Newton-Raphson with Brent fallback."""

import math
from scipy.optimize import brentq
from src.black_scholes import bs_price, bs_vega


class NoSolutionError(Exception):
    """Raised when no implied vol exists for the given market price."""


def implied_vol(
    market_price: float,
    S: float,
    K: float,
    T: float,
    r: float,
    option_type: str = "call",
    tol: float = 1e-6,
    max_iter: int = 100,
) -> float:
    """
    Compute implied volatility by inverting Black-Scholes.

    Uses Newton-Raphson (fast) with Brent fallback (robust).

    Parameters
    ----------
    market_price : observed option price
    S, K, T, r   : standard BS parameters
    option_type  : "call" or "put"
    tol          : convergence tolerance on σ
    max_iter     : max Newton iterations before fallback
    """
    # Arbitrage bounds: price must be between intrinsic and spot
    intrinsic = max(S - K * math.exp(-r * T), 0) if option_type == "call" else max(K * math.exp(-r * T) - S, 0)
    if market_price < intrinsic - tol:
        raise NoSolutionError(f"Price {market_price:.4f} is below intrinsic value {intrinsic:.4f}")
    if market_price >= S:
        raise NoSolutionError(f"Price {market_price:.4f} is above spot {S:.4f}")

    def objective(sigma: float) -> float:
        return bs_price(S, K, T, r, sigma, option_type) - market_price

    # ── Newton-Raphson ──
    sigma = 0.20  # initial guess: 20% vol
    for _ in range(max_iter):
        price = bs_price(S, K, T, r, sigma, option_type)
        vega = bs_vega(S, K, T, r, sigma) * 100  # bs_vega is per 1%, undo scaling

        if abs(vega) < 1e-10:
            break  # flat vega → Newton unsafe, fall through to Brent

        diff = price - market_price
        sigma -= diff / vega

        if sigma <= 0:
            sigma = 1e-6  # keep sigma positive

        if abs(diff) < tol:
            return sigma

    # ── Brent fallback ──
    try:
        return brentq(objective, 1e-6, 10.0, xtol=tol, maxiter=500)
    except ValueError:
        raise NoSolutionError(
            f"No implied vol found for price={market_price:.4f} "
            f"(S={S}, K={K}, T={T}, r={r}, type={option_type})"
        )
