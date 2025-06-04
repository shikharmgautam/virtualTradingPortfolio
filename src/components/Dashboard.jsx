import React, { useState } from 'react';
import { useStockContext } from '../contexts/StockContext';
import StockCard from './StockCard';
import LoadingSpinner from './LoadingSpinner';

const Dashboard = () => {
  const { selectedStocks, stockData, loading, error } = useStockContext();
  const [sortBy, setSortBy] = useState('alphabetical');
  
  if (selectedStocks.length === 0) {
    return (
      <div className="card text-center py-12 animate-fade-in">
        <h2 className="text-xl text-gray-700 mb-2 font-heading">Welcome to NIFTY 50 Stock Screener</h2>
        <p className="text-gray-500">Please select stocks above to begin analysis.</p>
      </div>
    );
  }
  
  if (loading && Object.keys(stockData).length === 0) {
    return <LoadingSpinner message="Fetching stock data..." />;
  }
  
  if (error) {
    return (
      <div className="card bg-red-50 border border-red-200 text-red-800 py-4 px-6">
        <p className="font-medium">Error: {error}</p>
        <p className="mt-2 text-sm">Please try again or select different stocks.</p>
      </div>
    );
  }

  const getSortedStocks = () => {
    const stocks = selectedStocks.filter(stock => stockData[stock.value]);
    
    if (sortBy === 'alphabetical') {
      return [...stocks].sort((a, b) => a.label.localeCompare(b.label));
    }
    
    if (sortBy === 'rsi') {
      return [...stocks].sort((a, b) => {
        const stockA = stockData[a.value];
        const stockB = stockData[b.value];
        
        if (!stockA || !stockB) return 0;
        
        const latestA = stockA[stockA.length - 1];
        const latestB = stockB[stockB.length - 1];
        
        return latestA.rsi - latestB.rsi;
      });
    }
    
    if (sortBy === 'signal') {
      return [...stocks].sort((a, b) => {
        const stockA = stockData[a.value];
        const stockB = stockData[b.value];
        
        if (!stockA || !stockB) return 0;
        
        const latestA = stockA[stockA.length - 1];
        const latestB = stockB[stockB.length - 1];
        
        // Buy (2) > Hold (1) > Sell (0)
        const signalValueA = latestA.signal === 'BUY' ? 2 : (latestA.signal === 'HOLD' ? 1 : 0);
        const signalValueB = latestB.signal === 'BUY' ? 2 : (latestB.signal === 'HOLD' ? 1 : 0);
        
        return signalValueB - signalValueA; // Descending order
      });
    }
    
    return stocks;
  };

  const sortedStocks = getSortedStocks();

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-semibold text-primary-800">Stock Analysis</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Sort by:</span>
          <select
            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="alphabetical">Name</option>
            <option value="rsi">RSI (Low to High)</option>
            <option value="signal">Signal</option>
          </select>
        </div>
      </div>
      
      {loading && <p className="text-sm text-gray-500 mb-4">Updating data...</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedStocks.map((stock) => (
          <StockCard 
            key={stock.value} 
            stock={stock} 
            data={stockData[stock.value] || []}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;