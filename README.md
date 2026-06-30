# Option Pricer

Pricer d'options européennes et américaines implémenté from scratch en Python, avec une interface web Next.js.

Trois méthodes de pricing indépendantes, vérifiées entre elles, et validées contre des données de marché réelles.

---

## Méthodes implémentées

### 1. Black-Scholes (formule fermée)
- Prix call/put européens
- 5 Greeks analytiques : Delta, Gamma, Vega, Theta, Rho
- Vérification : call ATM (S=K=100, T=1, r=5%, σ=20%) → **10.4506**

### 2. Arbre binomial CRR (Cox-Ross-Rubinstein)
- Options européennes **et américaines**
- Paramètres : `u = e^(σ√Δt)`, `d = 1/u`, probabilité risque-neutre `p`
- Convergence vers Black-Scholes quand N → ∞
- Early exercise : `max(continuation, intrinsic)` à chaque nœud

### 3. Monte Carlo
- Simulation de trajectoires log-normales avec correction d'Itô
- Réduction de variance par **variables antithétiques** (paires Z / −Z)
- Intervalle de confiance 95% : `prix ± 1.96 · σ/√N`

### 4. Volatilité implicite
- Inversion numérique de Black-Scholes
- **Newton-Raphson** (convergence quadratique, Vega comme dérivée)
- Fallback **Brent** si Newton diverge (vega ≈ 0 ou prix hors bornes)
- Application sur données réelles : smile de volatilité par strike

---

## Structure

```
.
├── src/
│   ├── black_scholes.py    # Prix + Greeks analytiques
│   ├── binomial.py         # Arbre CRR (européen + américain)
│   ├── monte_carlo.py      # MC avec antithétique
│   ├── implied_vol.py      # Solver Newton-Raphson + Brent
│   ├── market_data.py      # Chaîne d'options live (yfinance)
│   └── api.py              # FastAPI
├── tests/                  # 34 tests pytest
├── frontend/               # Interface Next.js + Tailwind
│   ├── app/page.tsx        # Pricer + Live Chain
│   └── lib/
│       ├── blackScholes.ts
│       ├── binomial.ts
│       └── monteCarlo.ts
├── scripts/
│   └── live_test.py        # CLI : vol implicite sur chaîne réelle
└── requirements.txt
```

---

## Installation

```bash
git clone https://github.com/ArthurD0/option-pricer.git
cd option-pricer

python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Tests

```bash
pytest                  # 34 tests
```

## Lancer l'app

```bash
# Terminal 1 — API Python (port 8000)
uvicorn src.api:app --reload

# Terminal 2 — Frontend (port 3000)
cd frontend && npm install && npm run dev
```

Ouvrir `http://localhost:3000`

- Onglet **Pricer** : saisir S, K, T, r, σ → prix par les 3 méthodes + Greeks
- Onglet **Live Chain** : ticker + expiry → chaîne d'options réelle + vol implicite par strike

## Test avec données réelles

```bash
python scripts/live_test.py AAPL call
python scripts/live_test.py SPY put 2025-09-19
```

---

## Stack

Python 3.11 · NumPy · SciPy · FastAPI · yfinance · Next.js · TypeScript · Tailwind CSS
