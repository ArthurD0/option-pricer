"""
Live options test — fetch real chain and print implied vol smile.

Usage:
    python scripts/live_test.py              # AAPL calls, nearest expiry
    python scripts/live_test.py MSFT put
    python scripts/live_test.py SPY call 2025-09-19
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.market_data import fetch_chain

ticker      = sys.argv[1] if len(sys.argv) > 1 else "AAPL"
option_type = sys.argv[2] if len(sys.argv) > 2 else "call"
expiry      = sys.argv[3] if len(sys.argv) > 3 else None

print(f"\nFetching {ticker} {option_type}s …\n")
df = fetch_chain(ticker, expiry=expiry, option_type=option_type)

spot   = df.attrs["spot"]
exp    = df.attrs["expiry"]
T      = df.attrs["T"]
r      = df.attrs["r"]

print(f"  Ticker  : {ticker}   Spot: ${spot}")
print(f"  Expiry  : {exp}   T={T:.3f}y   r={r*100:.2f}%")
print(f"  Type    : {option_type}")
print(f"  Strikes : {len(df)} (after liquidity filter)\n")

# Print table
header = f"{'Strike':>8}  {'Mkt Price':>9}  {'IV %':>6}  {'BS Price':>9}  {'BS-Mkt':>7}  {'Volume':>7}"
print(header)
print("-" * len(header))

for _, row in df.iterrows():
    iv  = f"{row['impl_vol_%']:.1f}%" if row["impl_vol_%"] else "  N/A"
    bsp = f"{row['bs_price']:.4f}"    if row["bs_price"]   else "   N/A"
    err = f"{row['bs_vs_market']:+.4f}" if row["bs_vs_market"] is not None else "    N/A"
    moneyness = "ATM" if abs(row["strike"] - spot) / spot < 0.02 else (
                "ITM" if (option_type == "call" and row["strike"] < spot) or
                          (option_type == "put"  and row["strike"] > spot) else "OTM")
    print(f"{row['strike']:>8.1f}  {row['market_price']:>9.4f}  {iv:>6}  {bsp:>9}  {err:>7}  {int(row['volume']):>7}  {moneyness}")

print(f"\n  Vol smile: min={df['impl_vol_%'].min():.1f}%  max={df['impl_vol_%'].max():.1f}%  ATM≈{df.iloc[len(df)//2]['impl_vol_%']:.1f}%")
