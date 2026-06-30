"""Tests vol implicite — round-trip BS, cas limites, robustesse."""

import pytest
from src.black_scholes import bs_price
from src.implied_vol import implied_vol, NoSolutionError

S, K, T, r = 100, 100, 1.0, 0.05


def _roundtrip(sigma_true: float, option_type: str):
    """Calcule un prix BS puis retrouve σ — doit coller à 1e-5."""
    price = bs_price(S, K, T, r, sigma_true, option_type)
    sigma_impl = implied_vol(price, S, K, T, r, option_type)
    assert abs(sigma_impl - sigma_true) < 1e-5, (
        f"σ_true={sigma_true:.4f}, σ_impl={sigma_impl:.4f}"
    )


def test_roundtrip_call_atm():       _roundtrip(0.20, "call")
def test_roundtrip_put_atm():        _roundtrip(0.20, "put")
def test_roundtrip_high_vol():       _roundtrip(0.60, "call")
def test_roundtrip_low_vol():        _roundtrip(0.05, "call")
def test_roundtrip_itm_call():
    price = bs_price(S, 80, T, r, 0.25, "call")
    assert abs(implied_vol(price, S, 80, T, r, "call") - 0.25) < 1e-5

def test_roundtrip_otm_put():
    price = bs_price(S, 80, T, r, 0.30, "put")
    assert abs(implied_vol(price, S, 80, T, r, "put") - 0.30) < 1e-5


def test_below_intrinsic_raises():
    """Prix inférieur à la valeur intrinsèque → pas de solution."""
    with pytest.raises(NoSolutionError):
        implied_vol(0.01, S, K, T, r, "call")  # call ATM vaut ~10, pas 0.01


def test_above_spot_raises():
    with pytest.raises(NoSolutionError):
        implied_vol(S + 1, S, K, T, r, "call")


def test_invalid_option_type():
    with pytest.raises(Exception):
        implied_vol(10.0, S, K, T, r, "future")
