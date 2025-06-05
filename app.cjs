const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');

const app = express();

// ✅ Allow requests from React frontend
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbPath = path.join(__dirname, 'data.ab');
const db = new sqlite3.Database(dbPath);
console.log('Database path:', dbPath);

// Create trades table if not exist, then start server
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT,
        quantity INTEGER,
        price REAL,
        type TEXT,
        commission REAL,
        pl REAL, // <-- Add this line
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating trades table:', err);

        // If the commission or pl column does not exist (old DB), add them
        db.all("PRAGMA table_info(trades)", (err, columns) => {
            if (err) return;
            const hasCommission = columns.some(col => col.name === 'commission');
            if (!hasCommission) {
                db.run("ALTER TABLE trades ADD COLUMN commission REAL", (err) => {
                    if (err) console.error('Error adding commission column:', err);
                    else console.log('Added commission column to trades table.');
                });
            }
            const hasPL = columns.some(col => col.name === 'pl');
            if (!hasPL) {
                db.run("ALTER TABLE trades ADD COLUMN pl REAL", (err) => {
                    if (err) console.error('Error adding pl column:', err);
                    else console.log('Added pl column to trades table.');
                });
            }
        });

        // Create positions table if not exists (was holdings)
        db.run(`CREATE TABLE IF NOT EXISTS positions (
            symbol TEXT PRIMARY KEY,
            stockName TEXT,
            shares INTEGER,
            avgPrice REAL
        )`, (err) => {
            if (err) console.error('Error creating positions table:', err);
        });

        // Start server only after table is created
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            // Load all trades and display portfolio on every server start
            db.all(`SELECT * FROM trades ORDER BY timestamp ASC`, [], (err, trades) => {
                if (err) {
                    console.error('Error loading trades:', err);
                } else {
                    console.log('All trades:', trades);
                    // Compute and display portfolio
                    const portfolio = {};
                    trades.forEach(trade => {
                        if (!portfolio[trade.symbol]) portfolio[trade.symbol] = 0;
                        if (trade.type === 'buy') portfolio[trade.symbol] += trade.quantity;
                        else if (trade.type === 'sell') portfolio[trade.symbol] -= trade.quantity;
                    });
                    console.log('Current portfolio:', portfolio);
                }
            });
        });
    });
});

// Add a trade and update positions
app.post('/trade', (req, res) => {
    const {
      date,
      type,
      symbol,
      stockName,
      shares,
      quantity,
      price,
      commission,
      pl
    } = req.body;

    const qty = Number(quantity ?? shares);

    if (!symbol || !qty || !price || !type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
        `INSERT INTO trades (symbol, quantity, price, type, commission, pl) VALUES (?, ?, ?, ?, ?, ?)`,
        [symbol, qty, price, type, commission, 0], // placeholder for pl, will update below if SELL
        function(err) {
            if (err) return res.status(400).json({ error: err.message });

            // --- Add/update positions logic ---
            if (type.toUpperCase() === 'BUY') {
                db.get(`SELECT * FROM positions WHERE symbol = ?`, [symbol], (err, position) => {
                    if (err) return;
                    if (position) {
                        const newShares = position.shares + qty;
                        const newAvgPrice = ((position.shares * position.avgPrice) + (qty * price)) / newShares;
                        db.run(`UPDATE positions SET shares = ?, avgPrice = ? WHERE symbol = ?`, [newShares, newAvgPrice, symbol]);
                    } else {
                        db.run(`INSERT INTO positions (symbol, stockName, shares, avgPrice) VALUES (?, ?, ?, ?)`, [symbol, stockName, qty, price]);
                    }
                });
            } else if (type.toUpperCase() === 'SELL') {
                db.get(`SELECT * FROM positions WHERE symbol = ?`, [symbol], (err, position) => {
                    if (err) return;
                    // Calculate realized P&L for this SELL trade
                    // Use avgPrice from before this SELL (i.e., before updating positions)
                    db.get(`SELECT avgPrice FROM positions WHERE symbol = ?`, [symbol], (err2, posBeforeSell) => {
                        let avgBuyPrice = posBeforeSell ? posBeforeSell.avgPrice : price; // fallback to sell price if not found
                        // If position is being fully closed, use previous avgPrice
                        if (!position) avgBuyPrice = price;
                        const pl = (price - avgBuyPrice) * qty - commission;
                        db.run(`UPDATE trades SET pl = ? WHERE id = ?`, [pl, this.lastID]);
                    });
                    if (position) {
                        const newShares = position.shares - qty;
                        if (newShares > 0) {
                            db.run(`UPDATE positions SET shares = ? WHERE symbol = ?`, [newShares, symbol]);
                        } else {
                            db.run(`DELETE FROM positions WHERE symbol = ?`, [symbol]);
                        }
                    }
                });
            }
            // --- End positions logic ---

            db.get(`SELECT * FROM trades WHERE id = ?`, [this.lastID], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(row);
            });
        }
    );
});

// Get all trades
app.get('/trades', (req, res) => {
    db.all(`SELECT * FROM trades ORDER BY timestamp DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get all transactions (same as trades, for transaction history)
app.get('/transactions', (req, res) => {
    db.all(`SELECT * FROM trades ORDER BY timestamp DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get current portfolio (aggregate holdings by symbol)
app.get('/portfolio', (req, res) => {
    db.all(
        `SELECT symbol, SUM(CASE WHEN type='buy' THEN quantity ELSE -quantity END) as total_quantity
         FROM trades GROUP BY symbol`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Delete a trade by id
app.delete('/trade/:id', (req, res) => {
    db.run(
        `DELETE FROM trades WHERE id = ?`,
        [req.params.id],
        function(err) {
            if (err) return res.status(400).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Trade not found' });
            res.json({ success: true });
        }
    );
});

// Add this endpoint to fetch stock data using Python script
app.get('/stockdata/:symbol', (req, res) => {
    try {
        const symbol = req.params.symbol;
        const py = spawn('python', [path.join(__dirname, 'fetch_stock_data.py'), symbol]);
        let data = '';
        let error = '';

        py.stdout.on('data', (chunk) => {
            data += chunk.toString();
        });

        py.stderr.on('data', (chunk) => {
            error += chunk.toString();
        });

        py.on('close', (code) => {
            if (code !== 0 || error) {
                console.error('Python error:', error);
                res.status(500).json({ error: error || `Python process exited with code ${code}` });
            } else {
                try {
                    const parsed = JSON.parse(data);
                    res.json(parsed);
                } catch (e) {
                    console.error('JSON parse error:', e, 'Raw data:', data);
                    res.status(500).json({ error: 'Failed to parse Python output: ' + e.message });
                }
            }
        });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add endpoint to get all positions (was holdings)
app.get('/positions', (req, res) => {
    db.all(`SELECT symbol, stockName, shares, avgPrice FROM positions`, [], (err, rows) => {
        if (err) {
            console.error('Error fetching positions:', err);
            return res.status(500).json({ error: err.message });
        }
        // Defensive: ensure array and all fields are present
        const safeRows = Array.isArray(rows) ? rows.map(row => ({
            symbol: row.symbol ?? '',
            stockName: row.stockName ?? '',
            shares: Number(row.shares ?? 0),
            avgPrice: Number(row.avgPrice ?? 0)
        })) : [];
        console.log('Fetched positions:', safeRows); // Debug log to verify data
        res.json(safeRows);
    });
});