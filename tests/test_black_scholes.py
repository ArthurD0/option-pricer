"""Tests Black-Scholes — paramètres ATM de référence."""

import pytest
from src.black_scholes import bs_price, bs_delta, bs_gamma, bs_vega, bs_theta, bs_rho

# Paramètres ATM de référence : call doit valoir ~10.45
S, K, T, r, sigma = 100, 100, 1.0, 0.05, 0.20


def test_call_atm_price():
    price = bs_price(S, K, T, r, sigma, "call")
    assert abs(price - 10.4506) < 0.01, f"Call ATM attendu ~10.45, obtenu {price:.4f}"


def test_put_call_parity():
    call = bs_price(S, K, T, r, sigma, "call")
    put = bs_price(S, K, T, r, sigma, "put")
    # C - P = S - K*e^(-rT)
    lhs = call - put
    rhs = S - K * __import__("math").exp(-r * T)
    assert abs(lhs - rhs) < 1e-10, f"Parité call-put violée : {lhs:.6f} != {rhs:.6f}"


def test_call_delta_range():
    delta = bs_delta(S, K, T, r, sigma, "call")
    assert 0 < delta < 1, f"Delta call doit être dans (0,1), obtenu {delta:.4f}"


def test_put_delta_range():
    delta = bs_delta(S, K, T, r, sigma, "put")
    assert -1 < delta < 0, f"Delta put doit être dans (-1,0), obtenu {delta:.4f}"


def test_call_put_delta_relation():
    """Delta call - Delta put = 1 (propriété fondamentale)."""
    dc = bs_delta(S, K, T, r, sigma, "call")
    dp = bs_delta(S, K, T, r, sigma, "put")
    assert abs(dc - dp - 1.0) < 1e-10


def test_gamma_positive():
    gamma = bs_gamma(S, K, T, r, sigma)
    assert gamma > 0


def test_vega_positive():
    vega = bs_vega(S, K, T, r, sigma)
    assert vega > 0


def test_theta_negative_call():
    """Le temps joue contre l'acheteur d'option."""
    theta = bs_theta(S, K, T, r, sigma, "call")
    assert theta < 0


def test_rho_call_positive():
    """Un call vaut plus quand les taux montent (actualisation du strike réduite)."""
    rho = bs_rho(S, K, T, r, sigma, "call")
    assert rho > 0


def test_rho_put_negative():
    rho = bs_rho(S, K, T, r, sigma, "put")
    assert rho < 0


def test_invalid_option_type():
    with pytest.raises(ValueError):
        bs_price(S, K, T, r, sigma, "future")
