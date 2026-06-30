"""Tests binomial tree — convergence vers Black-Scholes et options américaines."""

import math
import pytest
from src.binomial import crr_price
from src.black_scholes import bs_price

S, K, T, r, sigma = 100, 100, 1.0, 0.05, 0.20


def test_european_call_converges_to_bs():
    """Avec N=500 pas, l'arbre doit coller à BS à moins de 0.01."""
    bs = bs_price(S, K, T, r, sigma, "call")
    crr = crr_price(S, K, T, r, sigma, "call", american=False, N=500)
    assert abs(crr - bs) < 0.01, f"CRR={crr:.4f} vs BS={bs:.4f}"


def test_european_put_converges_to_bs():
    bs = bs_price(S, K, T, r, sigma, "put")
    crr = crr_price(S, K, T, r, sigma, "put", american=False, N=500)
    assert abs(crr - bs) < 0.01, f"CRR={crr:.4f} vs BS={bs:.4f}"


def test_american_put_ge_european_put():
    """L'option américaine vaut toujours au moins autant que l'européenne."""
    eur = crr_price(S, K, T, r, sigma, "put", american=False)
    amer = crr_price(S, K, T, r, sigma, "put", american=True)
    assert amer >= eur - 1e-9


def test_american_put_ge_intrinsic():
    """Prix américain >= valeur intrinsèque immédiate."""
    amer = crr_price(S, K, T, r, sigma, "put", american=True)
    assert amer >= max(K - S, 0)


def test_american_call_no_dividend_equals_european():
    """Sans dividende, exercer un call américain tôt n'est jamais optimal."""
    eur = crr_price(S, K, T, r, sigma, "call", american=False)
    amer = crr_price(S, K, T, r, sigma, "call", american=True)
    assert abs(amer - eur) < 1e-6


def test_put_call_parity_european():
    """Parité call-put doit tenir pour les options européennes."""
    call = crr_price(S, K, T, r, sigma, "call", american=False, N=500)
    put  = crr_price(S, K, T, r, sigma, "put",  american=False, N=500)
    parity = call - put - (S - K * math.exp(-r * T))
    assert abs(parity) < 0.01, f"Parité violée : {parity:.6f}"


def test_invalid_option_type():
    with pytest.raises(ValueError):
        crr_price(S, K, T, r, sigma, "future")
