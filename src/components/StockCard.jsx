import React, { useState } from 'react';
import { formatDate, formatPrice } from '../utils/formatters';
import StockChart from './StockChart';
import TradeModal from './TradeModal';

const StockCard = ({ stock, data }) => {
  const [tradeType, setTradeType] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="card animate-pulse bg-gray-50">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-40 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
      </div>
    );
  }

  const latest = data[data.length - 1];
  const previousClose = data.length > 1 ? data[data.length - 2].close : null;
  const priceChange = previousClose ? latest.close - previousClose : 0;
  const percentChange = previousClose ? (priceChange / previousClose) * 100 : 0;

  const signal = latest.rsi < 30 && latest.close > latest.ma9 
    ? 'BUY' 
    : latest.rsi > 70 && latest.close < latest.ma9 
      ? 'SELL' 
      : 'HOLD';

  const signalColors = {
    BUY: 'bg-success text-white',
    SELL: 'bg-error text-white',
    HOLD: 'bg-gray-200 text-gray-800'
  };

  return (
    <div className="card animate-slide-up hover:border-primary-100 group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-heading text-lg font-semibold text-gray-900">{stock.label}</h3>
          <p className="text-sm text-gray-500">{stock.value}</p>
        </div>
        <div className="flex items-center">
          <span className={`text-sm px-2 py-1 rounded-md font-medium ${signalColors[signal]}`}>
            {signal === 'BUY' ? '🔥 BUY' : signal === 'SELL' ? '⚠️ SELL' : signal}
          </span>
        </div>
      </div>
      
      <div className="h-40 mb-4">
        <StockChart data={data} />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500">Current Price</p>
          <p className="font-medium text-gray-900">{formatPrice(latest.close)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Price Change</p>
          <p className={`font-medium ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPrice(priceChange)} ({percentChange.toFixed(2)}%)
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">9-Day MA</p>
          <p className="font-medium text-gray-900">{formatPrice(latest.ma9)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">14-Day RSI</p>
          <p className={`font-medium ${
            latest.rsi < 30 ? 'text-green-600' : 
            latest.rsi > 70 ? 'text-red-600' : 
            'text-gray-900'
          }`}>
            {latest.rsi.toFixed(2)}
          </p>
        </div>
      </div>
      
      <div className="mt-auto flex gap-2">
        <button
          onClick={() => setTradeType('BUY')}
          className="flex-1 button-success"
        >
          Buy
        </button>
        <button
          onClick={() => setTradeType('SELL')}
          className="flex-1 button-error"
        >
          Sell
        </button>
      </div>

      <TradeModal
        isOpen={!!tradeType}
        onClose={() => setTradeType(null)}
        stock={stock}
        type={tradeType}
        currentPrice={latest.close}
      />
    </div>
  );
};

export default StockCard;