/**
 * Fetches stock data for a given symbol
 * In a real application, this would call an actual API
 */
export const fetchStockData = async (symbol) => {
  // In a real app, we would fetch from a real API like Alpha Vantage or Yahoo Finance
  // For this demo, we'll generate mock data
  return generateMockData(symbol);
};

/**
 * Calculates technical indicators for stock data
 */
export const calculateIndicators = (data) => {
  // Ensure data is in chronological order (oldest to newest)
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Calculate MA9
  const dataWithMA = calculateMovingAverage(sortedData, 9, 'close', 'ma9');
  
  // Calculate RSI14
  const dataWithRSI = calculateRSI(dataWithMA, 14);
  
  // Generate signals
  return generateSignals(dataWithRSI);
};

/**
 * Calculates moving average for a given period
 */
const calculateMovingAverage = (data, period, sourceKey, targetKey) => {
  const result = [...data];
  
  for (let i = 0; i < result.length; i++) {
    if (i < period - 1) {
      result[i][targetKey] = null;
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += result[i - j][sourceKey];
      }
      result[i][targetKey] = sum / period;
    }
  }
  
  return result;
};

/**
 * Calculates Relative Strength Index (RSI)
 */
const calculateRSI = (data, period) => {
  const result = [...data];
  
  // Calculate price changes
  for (let i = 1; i < result.length; i++) {
    result[i].change = result[i].close - result[i-1].close;
  }
  result[0].change = 0;
  
  // Calculate gains and losses
  for (let i = 0; i < result.length; i++) {
    result[i].gain = result[i].change > 0 ? result[i].change : 0;
    result[i].loss = result[i].change < 0 ? -result[i].change : 0;
  }
  
  // Calculate average gains and losses over the period
  for (let i = 0; i < result.length; i++) {
    if (i < period) {
      result[i].avgGain = null;
      result[i].avgLoss = null;
      result[i].rs = null;
      result[i].rsi = null;
    } else if (i === period) {
      // First RSI calculation uses simple average
      let sumGain = 0;
      let sumLoss = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sumGain += result[j].gain;
        sumLoss += result[j].loss;
      }
      result[i].avgGain = sumGain / period;
      result[i].avgLoss = sumLoss / period;
      
      // Calculate RS and RSI
      result[i].rs = result[i].avgLoss === 0 ? 100 : result[i].avgGain / result[i].avgLoss;
      result[i].rsi = 100 - (100 / (1 + result[i].rs));
    } else {
      // Subsequent calculations use smoothed average
      result[i].avgGain = ((result[i-1].avgGain * (period - 1)) + result[i].gain) / period;
      result[i].avgLoss = ((result[i-1].avgLoss * (period - 1)) + result[i].loss) / period;
      
      // Calculate RS and RSI
      result[i].rs = result[i].avgLoss === 0 ? 100 : result[i].avgGain / result[i].avgLoss;
      result[i].rsi = 100 - (100 / (1 + result[i].rs));
    }
  }
  
  return result;
};

/**
 * Generates signals based on the rules:
 * - Buy: RSI < 30 AND price > MA
 * - Sell: RSI > 70 AND price < MA
 */
const generateSignals = (data) => {
  const result = [...data];
  
  for (let i = 0; i < result.length; i++) {
    if (result[i].rsi === null || result[i].ma9 === null) {
      result[i].signal = 'HOLD'; // Not enough data
    } else if (result[i].rsi < 30 && result[i].close > result[i].ma9) {
      result[i].signal = 'BUY';
    } else if (result[i].rsi > 70 && result[i].close < result[i].ma9) {
      result[i].signal = 'SELL';
    } else {
      result[i].signal = 'HOLD';
    }
  }
  
  return result;
};

/**
 * Generates mock stock data for demonstration
 */
const generateMockData = (symbol) => {
  const today = new Date();
  const data = [];
  let price = getInitialPrice(symbol);
  const volatility = getVolatility(symbol);
  
  // Generate 100 days of data (more than enough for our indicators)
  for (let i = 99; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    // Random price movement based on volatility
    const change = (Math.random() - 0.5) * 2 * price * volatility;
    price += change;
    
    // Ensure price doesn't go negative
    if (price < 1) price = 1;
    
    // Add some randomness to volume
    const volume = Math.floor(Math.random() * 10000000) + 1000000;
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: price - (Math.random() * price * 0.01),
      high: price + (Math.random() * price * 0.02),
      low: price - (Math.random() * price * 0.02),
      close: price,
      volume
    });
  }
  
  return data;
};

/**
 * Gets an initial price for a stock based on its symbol
 */
const getInitialPrice = (symbol) => {
  // Hash the symbol to get a consistent but "random" price
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  // Use the hash to generate a price between 100 and 5000
  return Math.abs(hash % 4900) + 100;
};

/**
 * Gets volatility for a stock based on its symbol
 */
const getVolatility = (symbol) => {
  // Hash the symbol to get a consistent but "random" volatility
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  // Use the hash to generate a volatility between 0.005 and 0.02
  return (Math.abs(hash) % 15 + 5) / 1000;
};