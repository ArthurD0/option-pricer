"""Tests Monte Carlo — convergence, intervalle de confiance, parité call-put."""

import pytest
from src.monte_carlo import mc_price
from src.black_scholes import bs_price

S, K, T, r, sigma = 100, 100, 1.0, 0.05, 0.20


def test_call_within_confidence_interval():
    """Le vrai prix BS doit tomber dans l'IC 95% du MC."""
    res = mc_price(S, K, T, r, sigma, "call", n_paths=200_000)
    bs = bs_price(S, K, T, r, sigma, "call")
    assert res.ci_low < bs < res.ci_high, (
        f"BS={bs:.4f} hors de [{res.ci_low:.4f}, {res.ci_high:.4f}]"
    )


def test_put_within_confidence_interval():
    res = mc_price(S, K, T, r, sigma, "put", n_paths=200_000)
    bs = bs_price(S, K, T, r, sigma, "put")
    assert res.ci_low < bs < res.ci_high


def test_price_close_to_bs():
    """Avec 500k paths, on doit être à moins de 0.05 de BS."""
    res = mc_price(S, K, T, r, sigma, "call", n_paths=500_000)
    bs = bs_price(S, K, T, r, sigma, "call")
    assert abs(res.price - bs) < 0.05, f"MC={res.price:.4f} vs BS={bs:.4f}"


def test_stderr_decreases_with_more_paths():
    """L'erreur standard doit diminuer quand on ajoute des paths."""
    small = mc_price(S, K, T, r, sigma, n_paths=1_000)
    large = mc_price(S, K, T, r, sigma, n_paths=100_000)
    assert large.stderr < small.stderr


def test_put_call_parity():
    """C - P ≈ S - K·e^(-rT) à la précision MC."""
    import math
    call = mc_price(S, K, T, r, sigma, "call", n_paths=500_000, seed=1)
    put  = mc_price(S, K, T, r, sigma, "put",  n_paths=500_000, seed=1)
    lhs = call.price - put.price
    rhs = S - K * math.exp(-r * T)
    assert abs(lhs - rhs) < 0.1, f"Parité MC : {lhs:.4f} vs {rhs:.4f}"


def test_result_fields():
    res = mc_price(S, K, T, r, sigma)
    assert res.ci_low < res.price < res.ci_high
    assert res.stderr > 0
    assert res.n_paths == 100_000


def test_invalid_option_type():
    with pytest.raises(ValueError):
        mc_price(S, K, T, r, sigma, "future")
