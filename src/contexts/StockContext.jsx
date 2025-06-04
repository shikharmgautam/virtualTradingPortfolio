import React, { createContext, useState, useContext, useEffect } from 'react';
import { fetchStockData, calculateIndicators } from '../utils/stockUtils';
import { NIFTY50_STOCKS } from '../data/stockData';

const StockContext = createContext();

export const useStockContext = () => useContext(StockContext);

export const StockProvider = ({ children }) => {
  const [selectedStocks, setSelectedStocks] = useState([]);
  const [stockData, setStockData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data for selected stocks
  useEffect(() => {
    const fetchData = async () => {
      if (selectedStocks.length === 0) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const newStockData = {};
        
        for (const stock of selectedStocks) {
          // Only fetch if we don't already have this stock's data
          if (!stockData[stock.value]) {
            const data = await fetchStockData(stock.value);
            if (data && data.length > 0) {
              const processedData = calculateIndicators(data);
              newStockData[stock.value] = processedData;
            }
          } else {
            newStockData[stock.value] = stockData[stock.value];
          }
        }
        
        setStockData(prev => ({ ...prev, ...newStockData }));
      } catch (err) {
        console.error('Error fetching stock data:', err);
        setError('Failed to fetch stock data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedStocks]);

  // Clean up stockData when a stock is removed from selection
  useEffect(() => {
    const selectedStockValues = selectedStocks.map(stock => stock.value);
    const updatedStockData = { ...stockData };
    
    Object.keys(updatedStockData).forEach(symbol => {
      if (!selectedStockValues.includes(symbol)) {
        delete updatedStockData[symbol];
      }
    });
    
    setStockData(updatedStockData);
  }, [selectedStocks]);

  return (
    <StockContext.Provider
      value={{
        nifty50Stocks: NIFTY50_STOCKS,
        selectedStocks,
        setSelectedStocks,
        stockData,
        loading,
        error
      }}
    >
      {children}
    </StockContext.Provider>
  );
};

export default StockContext;