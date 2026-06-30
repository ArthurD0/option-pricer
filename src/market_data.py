"""Fetch live options chain from Yahoo Finance and compute implied vols."""

import datetime
import math
import pandas as pd
import yfinance as yf

from src.black_scholes import bs_price
from src.implied_vol import implied_vol, NoSolutionError


def _risk_free_rate() -> float:
    """Approximate risk-free rate from the 13-week T-bill (^IRX)."""
    try:
        irx = yf.Ticker("^IRX").fast_info["lastPrice"]
        return irx / 100
    except Exception:
        return 0.05  # fallback


def _time_to_maturity(expiry: str) -> float:
    """Calendar days from today to expiry, expressed in years."""
    exp = datetime.datetime.strptime(expiry, "%Y-%m-%d").date()
    today = datetime.date.today()
    return max((exp - today).days / 365, 1 / 365)


def fetch_chain(
    ticker: str,
    expiry: str | None = None,
    option_type: str = "call",
    min_volume: int = 10,
) -> pd.DataFrame:
    """
    Fetch a live options chain and attach implied vol + BS price.

    Parameters
    ----------
    ticker      : e.g. "AAPL", "SPY", "MSFT"
    expiry      : "YYYY-MM-DD" — nearest expiry if None
    option_type : "call" or "put"
    min_volume  : filter out illiquid strikes
    """
    tk = yf.Ticker(ticker)
    S = tk.fast_info["lastPrice"]
    r = _risk_free_rate()

    # Pick expiry
    available = tk.options
    if not available:
        raise ValueError(f"No options available for {ticker}")
    if expiry is None:
        expiry = available[0]
    elif expiry not in available:
        raise ValueError(f"Expiry {expiry} not available. Choose from: {list(available)}")

    T = _time_to_maturity(expiry)
    chain = tk.option_chain(expiry)
    df = chain.calls if option_type == "call" else chain.puts

    # Use mid-price (bid+ask)/2, fall back to lastPrice
    df = df.copy()
    df["mid"] = (df["bid"] + df["ask"]) / 2
    df["market_price"] = df["mid"].where(df["mid"] > 0, df["lastPrice"])

    # Filter illiquid and zero-price rows
    df = df[df["volume"] >= min_volume].copy()
    df = df[df["market_price"] > 0].copy()

    # Compute implied vol and BS theoretical price for each strike
    ivs, bs_prices, errors = [], [], []
    for _, row in df.iterrows():
        try:
            iv = implied_vol(row["market_price"], S, row["strike"], T, r, option_type)
            bp = bs_price(S, row["strike"], T, r, iv, option_type)
            ivs.append(round(iv * 100, 2))      # in %
            bs_prices.append(round(bp, 4))
            errors.append(round(bp - row["market_price"], 4))
        except NoSolutionError:
            ivs.append(None)
            bs_prices.append(None)
            errors.append(None)

    df["impl_vol_%"] = ivs
    df["bs_price"] = bs_prices
    df["bs_vs_market"] = errors

    result = df[["strike", "market_price", "impl_vol_%", "bs_price", "bs_vs_market", "volume", "openInterest"]].copy()
    result.attrs["ticker"]  = ticker
    result.attrs["spot"]    = round(S, 2)
    result.attrs["expiry"]  = expiry
    result.attrs["T"]       = round(T, 4)
    result.attrs["r"]       = round(r, 4)
    result.attrs["type"]    = option_type

    return result
