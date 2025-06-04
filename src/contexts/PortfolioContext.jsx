import React, { createContext, useState, useContext } from 'react';

const PortfolioContext = createContext();

export const usePortfolioContext = () => useContext(PortfolioContext);

export const PortfolioProvider = ({ children }) => {
  const [portfolio, setPortfolio] = useState({
    cash: 100000, // ₹1,00,000 initial capital
    positions: {}, // { symbol: { shares, avgPrice } }
    transactions: [], // [{date, type, symbol, shares, price, commission}]
  });

  const COMMISSION_PER_TRADE = 20; // ₹20 per trade
  const MAX_POSITION_SIZE = portfolio.cash * 0.2; // 20% of initial capital
  const MIN_TRADE_AMOUNT = 1000; // ₹1,000 minimum trade

  const executeOrder = (type, stock, shares, price) => {
    const orderAmount = shares * price;
    const totalCost = type === 'BUY' ? orderAmount + COMMISSION_PER_TRADE : 
                                      -(orderAmount - COMMISSION_PER_TRADE);

    if (type === 'BUY') {
      // Validate buy order
      if (orderAmount < MIN_TRADE_AMOUNT) {
        throw new Error(`Minimum trade amount is ₹${MIN_TRADE_AMOUNT}`);
      }
      if (orderAmount > MAX_POSITION_SIZE) {
        throw new Error('Order exceeds maximum position size (20% of portfolio)');
      }
      if (totalCost > portfolio.cash) {
        throw new Error('Insufficient funds');
      }
    } else {
      // Validate sell order
      const position = portfolio.positions[stock.value];
      if (!position || position.shares < shares) {
        throw new Error('Insufficient shares to sell');
      }
    }

    setPortfolio(prev => {
      const newPortfolio = { ...prev };
      
      // Update cash
      newPortfolio.cash -= totalCost;

      // Update positions
      const currentPosition = prev.positions[stock.value] || { shares: 0, avgPrice: 0 };
      if (type === 'BUY') {
        const totalShares = currentPosition.shares + shares;
        const totalCost = (currentPosition.shares * currentPosition.avgPrice) + (shares * price);
        newPortfolio.positions[stock.value] = {
          shares: totalShares,
          avgPrice: totalCost / totalShares
        };
      } else {
        const remainingShares = currentPosition.shares - shares;
        if (remainingShares > 0) {
          newPortfolio.positions[stock.value] = {
            ...currentPosition,
            shares: remainingShares
          };
        } else {
          delete newPortfolio.positions[stock.value];
        }
      }

      // Add transaction
      newPortfolio.transactions.push({
        date: new Date().toISOString(),
        type,
        symbol: stock.value,
        stockName: stock.label,
        shares,
        price,
        commission: COMMISSION_PER_TRADE
      });

      return newPortfolio;
    });
  };

  return (
    <PortfolioContext.Provider value={{
      portfolio,
      executeOrder,
      COMMISSION_PER_TRADE,
      MAX_POSITION_SIZE,
      MIN_TRADE_AMOUNT
    }}>
      {children}
    </PortfolioContext.Provider>
  );
};

export default PortfolioContext;