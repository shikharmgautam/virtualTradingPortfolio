import React from 'react';
import { usePortfolioContext } from '../contexts/PortfolioContext';
import { useStockContext } from '../contexts/StockContext';
import { formatPrice, formatDate } from '../utils/formatters';

const Portfolio = () => {
  const { portfolio, executeOrder, getPortfolioMetrics, fetchPortfolioFromBackend } = usePortfolioContext();
  const { stockData, selectedStocks, setSelectedStocks, nifty50Stocks } = useStockContext();
  const [exiting, setExiting] = React.useState({});

  // Always use backend-derived metrics and state
  const metrics = getPortfolioMetrics();
  const positions = metrics.positionsArr || [];
  const transactions = metrics.transactions || [];
  const cashAvailable = metrics.cash;

  // Auto-select all held positions in StockSelector if not already selected
  React.useEffect(() => {
    if (Array.isArray(positions)) {
      const heldSymbols = positions.map(pos => pos.symbol);
      const missing = heldSymbols.filter(sym => !selectedStocks.some(s => s.value === sym));
      if (missing.length > 0) {
        const toAdd = nifty50Stocks.filter(s => missing.includes(s.value));
        setSelectedStocks([...selectedStocks, ...toAdd]);
      }
    }
    // eslint-disable-next-line
  }, [positions]);

  // Total value of holdings (excluding cash)
  const positionsValue = React.useMemo(() => {
    let value = 0;
    if (Array.isArray(positions)) {
      for (const position of positions) {
        const currentData = stockData?.[position.symbol];
        if (!currentData || !Array.isArray(currentData) || !currentData.length) continue;
        const currentPrice = Number(currentData[currentData.length - 1].close);
        value += Number(position.shares) * currentPrice;
      }
    }
    return value;
  }, [positions, stockData]);

  // Total portfolio value = cash + holdings
  const totalPortfolioValue = React.useMemo(() => {
    return positionsValue + cashAvailable;
  }, [positionsValue, cashAvailable]);

  // Total P&L = sum of all realized and unrealized P&L
  const totalPL = React.useMemo(() => {
    // Realized P&L from transactions
    const realized = transactions.reduce((sum, t) => sum + (typeof t.pl === 'number' ? t.pl : 0), 0);
    // Unrealized P&L from open positions
    let unrealized = 0;
    for (const position of positions) {
      const currentData = stockData[position.symbol];
      if (!currentData || currentData.length === 0) continue;
      const currentPrice = currentData[currentData.length - 1].close;
      const costBasis = position.shares * position.avgPrice;
      const positionValue = position.shares * currentPrice;
      unrealized += positionValue - costBasis;
    }
    return realized + unrealized;
  }, [transactions, positions, stockData]);

  // Metrics for best/worst stock, win rate, Sharpe ratio
  const calculateMetrics = () => {
    let bestStock = { symbol: '', return: -Infinity };
    let worstStock = { symbol: '', return: Infinity };
    let winCount = 0;
    let totalPositions = 0;
    let returns = [];

    for (const position of positions) {
      const symbol = position.symbol;
      const currentData = stockData[symbol];
      if (!currentData || currentData.length === 0) continue;
      const currentPrice = currentData[currentData.length - 1].close;
      const positionValue = position.shares * currentPrice;
      const costBasis = position.shares * position.avgPrice;
      const unrealizedPL = positionValue - costBasis;
      const returnPercent = (unrealizedPL / costBasis) * 100;
      returns.push(returnPercent);
      if (returnPercent > bestStock.return) bestStock = { symbol, return: returnPercent };
      if (returnPercent < worstStock.return) worstStock = { symbol, return: returnPercent };
      if (returnPercent > 0) winCount++;
      totalPositions++;
    }
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length > 0 ? Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length) : 0;
    const sharpeRatio = stdDev !== 0 ? avgReturn / stdDev : 0;
    const winRate = totalPositions > 0 ? (winCount / totalPositions) * 100 : 0;
    return { bestStock, worstStock, winRate, sharpeRatio };
  };
  const extraMetrics = calculateMetrics();

  // Handle exit (sell all shares of a position)
  const handleExit = async (symbol, position) => {
    if (exiting[symbol]) return;
    setExiting(prev => ({ ...prev, [symbol]: true }));
    const currentData = stockData[symbol];
    if (!currentData || currentData.length === 0) {
      setExiting(prev => ({ ...prev, [symbol]: false }));
      return;
    }
    const currentPrice = currentData[currentData.length - 1].close;
    try {
      await executeOrder('SELL', { value: symbol, label: symbol }, Number(position.shares), currentPrice);
      await fetchPortfolioFromBackend();
    } catch (error) {
      console.error('Error executing exit order:', error);
    } finally {
      setExiting(prev => ({ ...prev, [symbol]: false }));
    }
  };

  // Transaction P&L fallback (should use backend pl if available)
  const calculateTransactionPL = (transaction) => {
    if (transaction.type === 'BUY') return null;
    // Find the corresponding buy transaction(s)
    const buyTransactions = transactions
      .filter(t => t.type === 'BUY' && t.symbol === transaction.symbol)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (buyTransactions.length === 0) return null;
    const avgBuyPrice = buyTransactions.reduce((acc, t) => acc + (t.price * t.shares), 0) /
                       buyTransactions.reduce((acc, t) => acc + t.shares, 0);
    return (transaction.price - avgBuyPrice) * transaction.shares - transaction.commission;
  };

  // Transaction signal (for display)
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

  // Calculate historical portfolio values for max drawdown
  const getPortfolioValueHistory = () => {
    // Sort transactions by date ascending
    const sortedTx = [...transactions].sort((a, b) => new Date(a.date || a.timestamp) - new Date(b.date || b.timestamp));
    let cash = 100000;
    let positionsMap = {};
    let values = [];
    for (const tx of sortedTx) {
      const symbol = tx.symbol;
      const shares = Number(tx.shares ?? tx.quantity);
      const price = Number(tx.price);
      const commission = Number(tx.commission ?? 0);
      if (tx.type === 'BUY') {
        cash -= (price * shares + commission);
        if (!positionsMap[symbol]) positionsMap[symbol] = { shares: 0, avgPrice: 0 };
        const pos = positionsMap[symbol];
        const newShares = pos.shares + shares;
        pos.avgPrice = (pos.shares * pos.avgPrice + shares * price) / newShares;
        pos.shares = newShares;
      } else if (tx.type === 'SELL') {
        cash += (price * shares - commission);
        if (positionsMap[symbol]) {
          positionsMap[symbol].shares -= shares;
          if (positionsMap[symbol].shares <= 0) delete positionsMap[symbol];
        }
      }
      // Calculate portfolio value at this point
      let positionsValue = 0;
      for (const [sym, pos] of Object.entries(positionsMap)) {
        const data = stockData[sym];
        if (data && data.length > 0) {
          // Use the price as of this transaction's date if available, else latest
          let priceOnDate = data.find(d => d.date === (tx.date || tx.timestamp)?.slice(0, 10));
          if (!priceOnDate) priceOnDate = data[data.length - 1];
          positionsValue += pos.shares * priceOnDate.close;
        }
      }
      values.push({
        date: tx.date || tx.timestamp,
        value: cash + positionsValue
      });
    }
    return values;
  };

  // Calculate max drawdown
  const maxDrawdown = React.useMemo(() => {
    const values = getPortfolioValueHistory();
    let peak = -Infinity;
    let maxDD = 0;
    for (const v of values) {
      if (v.value > peak) peak = v.value;
      const dd = peak > 0 ? (peak - v.value) / peak : 0;
      if (dd > maxDD) maxDD = dd;
    }
    return maxDD * 100; // as percent
  }, [transactions, stockData]);

  return (
    <div className="card mb-8">
      <h2 className="text-xl font-heading font-semibold mb-6 text-primary-800">Portfolio Dashboard</h2>
      {/* Portfolio Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Total Portfolio Value</p>
          <p className="text-xl font-semibold text-primary-600">{formatPrice(totalPortfolioValue)}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Total P&L</p>
          <p className={`text-xl font-semibold ${totalPL >= 0 ? 'text-success' : 'text-error'}`}>{formatPrice(totalPL)}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Cash Available</p>
          <p className="text-xl font-semibold text-primary-600">{formatPrice(cashAvailable)}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Win Rate</p>
          <p className="text-xl font-semibold text-primary-600">{extraMetrics.winRate.toFixed(1)}%</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Best Performing</p>
          <p className="text-xl font-semibold text-success">
            {extraMetrics.bestStock.symbol && isFinite(extraMetrics.bestStock.return) ? extraMetrics.bestStock.symbol : '-'}
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Worst Performing</p>
          <p className="text-xl font-semibold text-error">
            {extraMetrics.worstStock.symbol && isFinite(extraMetrics.worstStock.return) ? extraMetrics.worstStock.symbol : '-'}
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Sharpe Ratio</p>
          <p className="text-xl font-semibold text-primary-600">{extraMetrics.sharpeRatio.toFixed(2)}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Max Drawdown</p>
          <p className="text-xl font-semibold text-primary-600">{maxDrawdown.toFixed(2)}%</p>
        </div>
      </div>
      {/* Positions Table */}
      {positions.length > 0 ? (
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
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => {
                const symbol = position.symbol;
                const currentData = stockData[symbol];
                if (!currentData || currentData.length === 0) return null;
                const currentPrice = currentData[currentData.length - 1].close;
                const positionValue = position.shares * currentPrice;
                const costBasis = position.shares * position.avgPrice;
                const unrealizedPL = positionValue - costBasis;
                const returnPercent = (unrealizedPL / costBasis) * 100;
                return (
                  <tr key={symbol} className="border-b last:border-0">
                    <td className="py-3 font-medium">{symbol}</td>
                    <td className="py-3">{position.shares}</td>
                    <td className="py-3">{formatPrice(position.avgPrice)}</td>
                    <td className="py-3">{formatPrice(currentPrice)}</td>
                    <td className={`py-3 font-medium ${unrealizedPL >= 0 ? 'text-success' : 'text-error'}`}>{formatPrice(unrealizedPL)}</td>
                    <td className={`py-3 ${returnPercent >= 0 ? 'text-success' : 'text-error'}`}>{returnPercent.toFixed(2)}%</td>
                    <td className="py-3">
                      <button
                        onClick={() => handleExit(symbol, { shares: position.shares })}
                        disabled={!!exiting[symbol]}
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
        {transactions.length > 0 ? (
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
                {[...transactions].reverse().map((transaction, index) => {
                  // Use pl from backend if available, otherwise calculate
                  const pl = typeof transaction.pl === 'number' ? transaction.pl : calculateTransactionPL(transaction);
                  const signal = getTransactionSignal(transaction);
                  // Defensive: Only format valid dates
                  let formattedDate = '-';
                  if (transaction.date) {
                    const dateObj = new Date(transaction.date);
                    if (!isNaN(dateObj.getTime())) {
                      formattedDate = formatDate(transaction.date);
                    }
                  }
                  return (
                    <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2">{formattedDate}</td>
                      <td className="py-2 font-medium">{transaction.symbol}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${transaction.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{transaction.type}</span>
                      </td>
                      <td className="py-2">{transaction.shares ?? transaction.quantity}</td>
                      <td className="py-2">{formatPrice(transaction.price)}</td>
                      <td className="py-2">{formatPrice(transaction.commission)}</td>
                      <td className="py-2">{signal}</td>
                      <td className={`py-2 font-medium ${pl > 0 ? 'text-success' : pl < 0 ? 'text-error' : 'text-gray-500'}`}>{typeof pl === 'number' ? formatPrice(pl) : '-'}</td>
                      <td className="py-2 text-sm text-gray-500">{transaction.type === 'BUY' ? 'New Position' : 'Position Exit'}</td>
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