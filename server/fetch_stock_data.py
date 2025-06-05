import sys
import yfinance as yf
import json

def fetch(symbol):
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period="6mo")  # 6 months of daily data
    data = []
    for date, row in hist.iterrows():
        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "open": float(row["Open"]),
            "high": float(row["High"]),
            "low": float(row["Low"]),
            "close": float(row["Close"]),
            "volume": int(row["Volume"])
        })
    print(json.dumps(data))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("[]")
        sys.exit(1)
    fetch(sys.argv[1])
