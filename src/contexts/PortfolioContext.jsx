import React, { createContext, useState, useContext } from 'react';
import axios from 'axios';

const PortfolioContext = createContext();

export const usePortfolioContext = () => useContext(PortfolioContext);

export const PortfolioProvider = ({ children }) => {
  // Only store backend-reflected state
  const [portfolio, setPortfolio] = useState({
    cash: 100000, // Initial capital, will be recalculated from backend
    positionsArr: [], // [{symbol, stockName, shares, avgPrice}]
    transactions: [] // [{date, type, symbol, shares, price, commission}]
  });

  const COMMISSION_PER_TRADE = 20; // ₹20 per trade
  const MIN_TRADE_AMOUNT = 1000; // ₹1,000 minimum trade
  const INITIAL_CASH = 100000;

  // Fetch all trades from backend and recalculate cash and positions
  const fetchPortfolioFromBackend = async () => {
    try {
      const [tradesRes, positionsRes] = await Promise.all([
        axios.get('http://localhost:3000/trades'),
        axios.get('http://localhost:3000/positions')
      ]);
      const trades = Array.isArray(tradesRes.data) ? tradesRes.data : [];
      const positionsArr = Array.isArray(positionsRes.data) ? positionsRes.data : [];
      // Calculate cash from trades
      let cash = INITIAL_CASH;
      for (const t of trades) {
        if (t.type === 'BUY') {
          cash -= (Number(t.price) * Number(t.shares) + Number(t.commission));
        } else if (t.type === 'SELL') {
          cash += (Number(t.price) * Number(t.shares) - Number(t.commission));
        }
      }
      setPortfolio({
        cash,
        positionsArr,
        transactions: trades
      });
      return { cash, positionsArr, transactions: trades };
    } catch (err) {
      setPortfolio({ cash: INITIAL_CASH, positionsArr: [], transactions: [] });
      console.error('Failed to fetch portfolio from backend:', err);
      return { cash: INITIAL_CASH, positionsArr: [], transactions: [] };
    }
  };

  // Always use backend data for validation and metrics
  const executeOrder = async (type, stock, shares, price) => {
    // Always fetch latest backend state before validating
    const { cash, positionsArr } = await fetchPortfolioFromBackend();
    const orderAmount = shares * price;
    const MAX_POSITION_SIZE = INITIAL_CASH * 0.2; // 20% of initial capital
    let position = positionsArr.find(p => p.symbol === stock.value);

    if (type === 'BUY') {
      if (orderAmount < MIN_TRADE_AMOUNT) {
        throw new Error(`Minimum trade amount is ₹${MIN_TRADE_AMOUNT}`);
      }
      if (orderAmount > MAX_POSITION_SIZE) {
        throw new Error('Order exceeds maximum position size (20% of portfolio)');
      }
      if ((orderAmount + COMMISSION_PER_TRADE) > cash) {
        throw new Error('Insufficient funds');
      }
    } else {
      // SELL/EXIT
      if (!position || Number(position.shares) < shares) {
        throw new Error('Insufficient shares to sell');
      }
    }

    // POST trade to backend
    try {
      await axios.post('http://localhost:3000/trade', {
        date: new Date().toISOString(),
        type: type || '',
        symbol: stock?.value ?? '',
        stockName: stock?.label ?? '',
        shares: Number(shares),
        price: Number(price),
        commission: Number(COMMISSION_PER_TRADE),
        pl: 0 // Let backend calculate P&L if needed
      });
      // After successful trade, refresh state from backend
      await fetchPortfolioFromBackend();
    } catch (err) {
      if (err.response) {
        console.error('Failed to record trade:', err.response.data);
        throw new Error(err.response.data?.error || 'Failed to record trade');
      } else {
        console.error('Failed to record trade:', err);
        throw new Error('Failed to record trade');
      }
    }
  };

  // Expose backend-derived portfolio metrics
  const getPortfolioMetrics = (stockData = {}) => {
    // All metrics are based on backend state only
    const { positionsArr, transactions } = portfolio;
    // Calculate total P&L from transactions
    const totalPL = transactions.reduce((sum, t) => sum + (typeof t.pl === 'number' ? t.pl : 0), 0);
    // Calculate value of all held positions using avg buy price (not current price)
    let positionsValue = 0;
    for (const pos of positionsArr) {
      positionsValue += Number(pos.shares) * Number(pos.avgPrice);
    }
    // Cash available = 100000 - value of all held positions (at buy price) + totalPL
    const cash = 100000 - positionsValue + totalPL;
    // Calculate invested amount
    let invested = 0;
    for (const pos of positionsArr) {
      invested += Number(pos.shares) * Number(pos.avgPrice);
    }
    // Calculate realized P&L from transactions
    let realizedPL = 0;
    for (const t of transactions) {
      if (t.type === 'SELL') {
        realizedPL += (Number(t.price) - Number(t.avgPrice || 0)) * Number(t.shares) - Number(t.commission);
      }
    }
    return {
      cash,
      invested,
      realizedPL,
      positionsArr,
      transactions,
      totalPL
    };
  };

  // Initial load
  React.useEffect(() => {
    fetchPortfolioFromBackend();
  }, []);

  return (
    <PortfolioContext.Provider value={{
      portfolio,
      executeOrder,
      COMMISSION_PER_TRADE,
      MIN_TRADE_AMOUNT,
      getPortfolioMetrics,
      fetchPortfolioFromBackend
    }}>
      {children}
    </PortfolioContext.Provider>
  );
};

export default PortfolioContext;