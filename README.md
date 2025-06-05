# Nifty50 Virtual Trading Portfolio

A full-stack web application for virtual trading and portfolio management using Nifty50 stocks. This project features a React frontend, a Node.js/Express backend with SQLite, and a Supabase Edge Function for fetching real stock data from Yahoo Finance.

---

## Features
- Virtual trading with Nifty50 stocks
- Real-time stock data (via Supabase Edge Function)
- Technical indicators (MA9, RSI14, buy/sell/hold signals)
- Portfolio and transaction tracking
- Modern, responsive UI with Tailwind CSS

---

## Project Structure
```
virtualTradingPortfolio/
├── server/                # Node.js/Express backend
│   ├── app.cjs
│   └── package.json
├── src/                   # React frontend
│   ├── App.jsx, main.jsx, ...
│   ├── components/
│   ├── contexts/
│   ├── data/
│   └── utils/
├── supabase/functions/    # Supabase Edge Function for stock data
│   └── stock-data/index.ts
├── render.yaml            # Render deployment config
├── package.json           # Frontend dependencies
├── vite.config.js         # Vite config (with proxy)
└── README.md
```

---

## Setup Instructions

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm
- (Optional) Supabase account for deploying the Edge Function

### 2. Install Dependencies
#### Backend
```
cd server
npm install
```
#### Frontend
```
npm install
```

### 3. Environment Variables
- The backend uses a SQLite database file. By default, it uses `/tmp/data.ab` on Render or `server/data.ab` locally.
- To override, set the `DB_PATH` environment variable.

### 4. Running Locally
#### Start Backend
```
cd server
node app.cjs
```
#### Start Frontend (in a new terminal)
```
npm run dev
```
- The frontend runs on http://localhost:5173
- The backend runs on http://localhost:3000

#### API Proxy
- The frontend uses Vite's proxy (see `vite.config.js`) to forward API requests to the backend.

### 5. Deploying on Render
- See `render.yaml` for service definitions.
- Backend and frontend are deployed as separate web services.
- The backend uses `/tmp/data.ab` for the database file (ephemeral on Render free tier).

### 6. Supabase Edge Function (Stock Data)
- The Edge Function in `supabase/functions/stock-data/index.ts` fetches historical stock data from Yahoo Finance.
- Deploy to your Supabase project and update the frontend/backend to use the deployed endpoint if needed.

---

## API Endpoints

### Backend (Express)
- `GET /trades` — List all trades
- `GET /positions` — List all current positions
- `GET /portfolio` — Portfolio summary
- `GET /transactions` — Transaction history
- `POST /trade` — Execute a trade (buy/sell)
- `DELETE /trade/:id` — Delete a trade
- `GET /stockdata/:symbol` — Fetch stock data (calls Python script or Supabase Edge Function)

### Supabase Edge Function
- `GET /?symbol=RELIANCE` — Returns last 100 days of historical data for the given symbol (auto-appends `.NS`)

---

## Technical Notes
- The backend database is ephemeral on Render free tier (`/tmp/data.ab` is wiped on restart).
- For persistent storage, use a managed database or volume.
- The frontend expects the backend to be available at `/` (proxied in dev, set correct URL in production).

---

## Credits
- Stock data via Yahoo Finance (via Supabase Edge Function)
- Built with React, Express, SQLite, Tailwind CSS

---

## License
MIT

