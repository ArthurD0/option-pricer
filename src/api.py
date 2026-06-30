"""FastAPI — Option Pricer API."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal

from src.black_scholes import bs_price, bs_delta, bs_gamma, bs_vega, bs_theta, bs_rho
from src.market_data import fetch_chain

app = FastAPI(title="Option Pricer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PriceRequest(BaseModel):
    S: float = Field(..., gt=0)
    K: float = Field(..., gt=0)
    T: float = Field(..., gt=0)
    r: float
    sigma: float = Field(..., gt=0)
    option_type: Literal["call", "put"] = "call"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/price")
def price(req: PriceRequest):
    try:
        args = (req.S, req.K, req.T, req.r, req.sigma)
        return {
            "price": round(bs_price(*args, req.option_type), 6),
            "delta": round(bs_delta(*args, req.option_type), 6),
            "gamma": round(bs_gamma(*args), 6),
            "vega":  round(bs_vega(*args), 6),
            "theta": round(bs_theta(*args, req.option_type), 6),
            "rho":   round(bs_rho(*args, req.option_type), 6),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/expirations/{ticker}")
def expirations(ticker: str):
    try:
        import yfinance as yf
        tk = yf.Ticker(ticker.upper())
        info = tk.fast_info
        return {
            "ticker":      ticker.upper(),
            "spot":        round(info["lastPrice"], 2),
            "expirations": list(tk.options),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/chain/{ticker}")
def chain(ticker: str, expiry: str, option_type: str = "call", min_volume: int = 5):
    try:
        df = fetch_chain(ticker.upper(), expiry=expiry, option_type=option_type, min_volume=min_volume)
        return {
            "ticker":  df.attrs["ticker"],
            "spot":    df.attrs["spot"],
            "expiry":  df.attrs["expiry"],
            "T":       df.attrs["T"],
            "r":       df.attrs["r"],
            "type":    df.attrs["type"],
            "rows":    df.where(df.notna(), None).to_dict(orient="records"),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
