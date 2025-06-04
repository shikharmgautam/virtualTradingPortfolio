import React from 'react';
import { usePortfolioContext } from '../contexts/PortfolioContext';
import { useStockContext } from '../contexts/StockContext';
import { formatPrice, formatDate } from '../utils/formatters';

const Portfolio = () => {
  const { portfolio, executeOrder } = usePortfolioContext();
  const { stockData } = useStockContext();

  const calculateMetrics = () => {
    let totalValue = portfolio.cash;
    let totalPL = 0;
    let bestStock = { symbol: '', return: -Infinity };
    let worstStock = { symbol: '', return: Infinity };
    let winCount = 0;
    let totalPositions = 0;
    let returns = [];

    Object.entries(portfolio.positions).forEach(([symbol, position]) => {
      const currentData = stockData[symbol];
      if (!currentData || currentData.length === 0) return;

      const currentPrice = currentData[currentData.length - 1].close;
      const positionValue = position.shares * currentPrice;
      const costBasis = position.shares * position.avgPrice;
      const unrealizedPL = positionValue - costBasis;
      const returnPercent = (unrealizedPL / costBasis) * 100;

      totalValue += positionValue;
      totalPL += unrealizedPL;
      returns.push(returnPercent);

      if (returnPercent > bestStock.return) {
        bestStock = { symbol, return: returnPercent };
      }
      if (returnPercent < worstStock.return) {
        worstStock = { symbol, return: returnPercent };
      }

      if (returnPercent > 0) winCount++;
      totalPositions++;
    });

    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length > 0 ? Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length) : 0;
    const sharpeRatio = stdDev !== 0 ? avgReturn / stdDev : 0;
    const winRate = totalPositions > 0 ? (winCount / totalPositions) * 100 : 0;

    return {
      totalValue,
      totalPL,
      bestStock,
      worstStock,
      winRate,
      sharpeRatio
    };
  };

  const metrics = calculateMetrics();

  const handleExit = async (symbol, position) => {
    const currentData = stockData[symbol];
    if (!currentData || currentData.length === 0) return;

    const currentPrice = currentData[currentData.length - 1].close;
    try {
      executeOrder('SELL', { value: symbol, label: symbol }, position.shares, currentPrice);
    } catch (error) {
      console.error('Error executing exit order:', error);
    }
  };

  const calculateDaysHeld = (symbol) => {
    const position = portfolio.positions[symbol];
    const firstTransaction = portfolio.transactions
      .find(t => t.symbol === symbol && t.type === 'BUY');
    
    if (!firstTransaction) return 0;
    
    const startDate = new Date(firstTransaction.date);
    const today = new Date();
    return Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  };

  const calculateTransactionPL = (transaction) => {
    if (transaction.type === 'BUY') return null;
    
    // Find the corresponding buy transaction(s)
    const buyTransactions = portfolio.transactions
      .filter(t => t.type === 'BUY' && t.symbol === transaction.symbol)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (buyTransactions.length === 0) return null;

    const avgBuyPrice = buyTransactions.reduce((acc, t) => acc + (t.price * t.shares), 0) / 
                       buyTransactions.reduce((acc, t) => acc + t.shares, 0);

    return (transaction.price - avgBuyPrice) * transaction.shares - transaction.commission;
  };

  const getTransactionSignal = (transaction) => {
    const data = stockData[transaction.symbol];
    if (!data || data.length === 0) return '-';

    const transactionDate = new Date(transaction.date);
    const transactionData = data.find(d => new Date(d.date).toDateString() === transactionDate.toDateString());
    
    if (!transactionData) return '-';

    if (transactionData.rsi < 30 && transactionData.close > transactionData.ma9) {
      return '🔥 Strong Buy';
    } else if (transactionData.rsi > 70 && transactionData.close < transactionData.ma9) {
      return '⚠️ Strong Sell';
    }
    return '-';
  };

  return (
    <div className="card mb-8">
      <h2 className="text-xl font-heading font-semibold mb-6 text-primary-800">Portfolio Dashboard</h2>
      
      {/* Portfolio Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Total Portfolio Value</p>
          <p className="text-xl font-semibold text-primary-600">{formatPrice(metrics.totalValue)}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Total P&L</p>
          <p className={`text-xl font-semibold ${metrics.totalPL >= 0 ? 'text-success' : 'text-error'}`}>
            {formatPrice(metrics.totalPL)}
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Win Rate</p>
          <p className="text-xl font-semibold text-primary-600">{metrics.winRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Best Performing</p>
          <p className="text-xl font-semibold text-success">
            {metrics.bestStock.symbol} ({metrics.bestStock.return.toFixed(1)}%)
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Worst Performing</p>
          <p className="text-xl font-semibold text-error">
            {metrics.worstStock.symbol} ({metrics.worstStock.return.toFixed(1)}%)
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Sharpe Ratio</p>
          <p className="text-xl font-semibold text-primary-600">{metrics.sharpeRatio.toFixed(2)}</p>
        </div>
      </div>

      {/* Holdings Table */}
      {Object.keys(portfolio.positions).length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th className="pb-2">Ticker</th>
                <th className="pb-2">Quantity</th>
                <th className="pb-2">Avg Buy Price</th>
                <th className="pb-2">Current Price</th>
                <th className="pb-2">Unrealized P&L</th>
                <th className="pb-2">Return %</th>
                <th className="pb-2">Days Held</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(portfolio.positions).map(([symbol, position]) => {
                const currentData = stockData[symbol];
                if (!currentData || currentData.length === 0) return null;

                const currentPrice = currentData[currentData.length - 1].close;
                const positionValue = position.shares * currentPrice;
                const costBasis = position.shares * position.avgPrice;
                const unrealizedPL = positionValue - costBasis;
                const returnPercent = (unrealizedPL / costBasis) * 100;
                const daysHeld = calculateDaysHeld(symbol);

                return (
                  <tr key={symbol} className="border-b last:border-0">
                    <td className="py-3 font-medium">{symbol}</td>
                    <td className="py-3">{position.shares}</td>
                    <td className="py-3">{formatPrice(position.avgPrice)}</td>
                    <td className="py-3">{formatPrice(currentPrice)}</td>
                    <td className={`py-3 font-medium ${unrealizedPL >= 0 ? 'text-success' : 'text-error'}`}>
                      {formatPrice(unrealizedPL)}
                    </td>
                    <td className={`py-3 ${returnPercent >= 0 ? 'text-success' : 'text-error'}`}>
                      {returnPercent.toFixed(2)}%
                    </td>
                    <td className="py-3">{daysHeld}</td>
                    <td className="py-3">
                      <button
                        onClick={() => handleExit(symbol, position)}
                        className="px-3 py-1 text-sm bg-error text-white rounded hover:bg-red-600 transition-colors"
                      >
                        Exit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No positions in portfolio</p>
      )}

      {/* Transaction History */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Transaction History</h3>
        {portfolio.transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-600 border-b">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Ticker</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Quantity</th>
                  <th className="pb-2">Price</th>
                  <th className="pb-2">Commission</th>
                  <th className="pb-2">Signal</th>
                  <th className="pb-2">P&L</th>
                  <th className="pb-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...portfolio.transactions].reverse().map((transaction, index) => {
                  const pl = calculateTransactionPL(transaction);
                  const signal = getTransactionSignal(transaction);
                  
                  return (
                    <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2">{formatDate(transaction.date)}</td>
                      <td className="py-2 font-medium">{transaction.symbol}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          transaction.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="py-2">{transaction.shares}</td>
                      <td className="py-2">{formatPrice(transaction.price)}</td>
                      <td className="py-2">{formatPrice(transaction.commission)}</td>
                      <td className="py-2">{signal}</td>
                      <td className={`py-2 font-medium ${pl > 0 ? 'text-success' : pl < 0 ? 'text-error' : 'text-gray-500'}`}>
                        {pl ? formatPrice(pl) : '-'}
                      </td>
                      <td className="py-2 text-sm text-gray-500">
                        {transaction.type === 'BUY' ? 'New Position' : 'Position Exit'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No transactions yet</p>
        )}
      </div>
    </div>
  );
};

export default Portfolio;