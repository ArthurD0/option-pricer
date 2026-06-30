"""Black-Scholes pricer — European options."""

import math
from scipy.stats import norm


def _d1(S: float, K: float, T: float, r: float, sigma: float) -> float:
    """d1 : log-moneyness ajusté de la dérive et de la convexité."""
    return (math.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))


def _d2(d1: float, sigma: float, T: float) -> float:
    """d2 = d1 - sigma*sqrt(T) : probabilité risque-neutre d'exercice."""
    return d1 - sigma * math.sqrt(T)


def bs_price(
    S: float, K: float, T: float, r: float, sigma: float,
    option_type: str = "call",
) -> float:
    """
    Prix Black-Scholes d'une option européenne.

    Parameters
    ----------
    S           : prix spot du sous-jacent
    K           : prix d'exercice (strike)
    T           : maturité en années
    r           : taux sans risque continu
    sigma       : volatilité annualisée
    option_type : "call" ou "put"
    """
    d1 = _d1(S, K, T, r, sigma)
    d2 = _d2(d1, sigma, T)
    discount = math.exp(-r * T)

    if option_type == "call":
        return S * norm.cdf(d1) - K * discount * norm.cdf(d2)
    elif option_type == "put":
        # Parité call-put : P = C - S + K*e^(-rT)
        call = S * norm.cdf(d1) - K * discount * norm.cdf(d2)
        return call - S + K * discount
    else:
        raise ValueError(f"option_type doit être 'call' ou 'put', reçu '{option_type}'")


def bs_delta(S: float, K: float, T: float, r: float, sigma: float,
             option_type: str = "call") -> float:
    """Delta = dC/dS.  Call : N(d1).  Put : N(d1) - 1."""
    d1 = _d1(S, K, T, r, sigma)
    if option_type == "call":
        return norm.cdf(d1)
    return norm.cdf(d1) - 1.0


def bs_gamma(S: float, K: float, T: float, r: float, sigma: float) -> float:
    """Gamma = d²C/dS² = N'(d1) / (S·sigma·sqrt(T)).  Identique call et put."""
    d1 = _d1(S, K, T, r, sigma)
    return norm.pdf(d1) / (S * sigma * math.sqrt(T))


def bs_vega(S: float, K: float, T: float, r: float, sigma: float) -> float:
    """Vega = dC/d_sigma = S·sqrt(T)·N'(d1).  Pour un move de 1% de vol."""
    d1 = _d1(S, K, T, r, sigma)
    return S * math.sqrt(T) * norm.pdf(d1) / 100


def bs_theta(S: float, K: float, T: float, r: float, sigma: float,
             option_type: str = "call") -> float:
    """Theta = dC/dt par jour calendaire (convention 365 jours)."""
    d1 = _d1(S, K, T, r, sigma)
    d2 = _d2(d1, sigma, T)
    decay = -S * norm.pdf(d1) * sigma / (2 * math.sqrt(T))
    discount = math.exp(-r * T)

    if option_type == "call":
        return (decay - r * K * discount * norm.cdf(d2)) / 365
    return (decay + r * K * discount * norm.cdf(-d2)) / 365


def bs_rho(S: float, K: float, T: float, r: float, sigma: float,
           option_type: str = "call") -> float:
    """Rho = dC/dr.  Pour un move de 1% du taux."""
    d1 = _d1(S, K, T, r, sigma)
    d2 = _d2(d1, sigma, T)
    discount = math.exp(-r * T)

    if option_type == "call":
        return K * T * discount * norm.cdf(d2) / 100
    return -K * T * discount * norm.cdf(-d2) / 100
