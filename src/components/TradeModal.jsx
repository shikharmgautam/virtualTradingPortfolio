import React, { useState } from 'react';
import { usePortfolioContext } from '../contexts/PortfolioContext';
import { formatPrice } from '../utils/formatters';

const TradeModal = ({ isOpen, onClose, stock, type, currentPrice }) => {
  const [shares, setShares] = useState('');
  const [error, setError] = useState('');
  const { executeOrder, COMMISSION_PER_TRADE, portfolio } = usePortfolioContext();

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const shareCount = Number(shares);
    if (!shareCount || shareCount <= 0) {
      setError('Please enter a valid number of shares');
      return;
    }

    try {
      executeOrder(type, stock, shareCount, currentPrice);
      onClose();
      setShares('');
    } catch (err) {
      setError(err.message);
    }
  };

  const totalCost = Number(shares) * currentPrice;
  const totalWithCommission = type === 'BUY' 
    ? totalCost + COMMISSION_PER_TRADE
    : totalCost - COMMISSION_PER_TRADE;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">
          {type} {stock.label}
        </h2>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">Current Price</p>
          <p className="text-lg font-semibold">{formatPrice(currentPrice)}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Shares
            </label>
            <input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter number of shares"
              min="1"
            />
          </div>

          {shares && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="flex justify-between text-sm mb-1">
                <span>Subtotal</span>
                <span>{formatPrice(totalCost)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span>Commission</span>
                <span>{formatPrice(COMMISSION_PER_TRADE)}</span>
              </div>
              <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
                <span>Total {type === 'BUY' ? 'Cost' : 'Proceeds'}</span>
                <span>{formatPrice(Math.abs(totalWithCommission))}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white rounded ${
                type === 'BUY' 
                  ? 'bg-success hover:bg-green-600' 
                  : 'bg-error hover:bg-red-600'
              }`}
            >
              Confirm {type}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TradeModal;