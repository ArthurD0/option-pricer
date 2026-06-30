"""FastAPI — Option Pricer API."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal

from src.black_scholes import (
    bs_price, bs_delta, bs_gamma, bs_vega, bs_theta, bs_rho,
)

app = FastAPI(
    title="Option Pricer API",
    description="Prix et Greeks d'options européennes (Black-Scholes)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PriceRequest(BaseModel):
    S: float = Field(..., gt=0, description="Prix spot du sous-jacent")
    K: float = Field(..., gt=0, description="Strike")
    T: float = Field(..., gt=0, description="Maturité en années")
    r: float = Field(..., description="Taux sans risque continu")
    sigma: float = Field(..., gt=0, description="Volatilité annualisée")
    option_type: Literal["call", "put"] = Field("call", description="Type d'option")


class PriceResponse(BaseModel):
    price: float
    delta: float
    gamma: float
    vega: float
    theta: float
    rho: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/price", response_model=PriceResponse)
def price(req: PriceRequest):
    try:
        args = (req.S, req.K, req.T, req.r, req.sigma)
        return PriceResponse(
            price=round(bs_price(*args, req.option_type), 6),
            delta=round(bs_delta(*args, req.option_type), 6),
            gamma=round(bs_gamma(*args), 6),
            vega=round(bs_vega(*args), 6),
            theta=round(bs_theta(*args, req.option_type), 6),
            rho=round(bs_rho(*args, req.option_type), 6),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
