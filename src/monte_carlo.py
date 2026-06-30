"""Monte Carlo pricer — European options with antithetic variance reduction."""

import numpy as np
from dataclasses import dataclass


@dataclass
class MCResult:
    price: float
    stderr: float       # standard error of the estimate
    ci_low: float       # 95% confidence interval lower bound
    ci_high: float      # 95% confidence interval upper bound
    n_paths: int


def mc_price(
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    option_type: str = "call",
    n_paths: int = 100_000,
    seed: int | None = 42,
) -> MCResult:
    """
    Price a European option by Monte Carlo simulation.

    Uses antithetic variates: for each draw Z we also simulate -Z,
    which halves variance at virtually no extra cost.

    Parameters
    ----------
    S           : spot price
    K           : strike
    T           : time to maturity in years
    r           : continuous risk-free rate
    sigma       : annualised volatility
    option_type : "call" or "put"
    n_paths     : number of simulation paths (antithetic → effective 2×n_paths)
    seed        : random seed for reproducibility
    """
    if option_type not in ("call", "put"):
        raise ValueError(f"option_type must be 'call' or 'put', got '{option_type}'")

    rng = np.random.default_rng(seed)

    # Draw n_paths standard normals
    Z = rng.standard_normal(n_paths)

    # Itô-corrected log-return: (r - σ²/2)T + σ√T·Z
    log_return = (r - 0.5 * sigma**2) * T + sigma * np.sqrt(T) * Z

    # Antithetic: simulate both Z and -Z
    S_plus  = S * np.exp(log_return)
    S_minus = S * np.exp((r - 0.5 * sigma**2) * T - sigma * np.sqrt(T) * Z)

    # Payoffs
    if option_type == "call":
        payoffs = 0.5 * (np.maximum(S_plus - K, 0) + np.maximum(S_minus - K, 0))
    else:
        payoffs = 0.5 * (np.maximum(K - S_plus, 0) + np.maximum(K - S_minus, 0))

    # Discount to present value
    discount = np.exp(-r * T)
    pv = discount * payoffs

    price  = float(pv.mean())
    stderr = float(pv.std(ddof=1) / np.sqrt(n_paths))

    return MCResult(
        price=price,
        stderr=stderr,
        ci_low=price  - 1.96 * stderr,
        ci_high=price + 1.96 * stderr,
        n_paths=n_paths,
    )
