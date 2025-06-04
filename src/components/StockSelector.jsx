import React from 'react';
import Select from 'react-select';
import { useStockContext } from '../contexts/StockContext';

const StockSelector = () => {
  const { nifty50Stocks, selectedStocks, setSelectedStocks } = useStockContext();
  
  const handleChange = (selected) => {
    setSelectedStocks(selected || []);
  };

  const customStyles = {
    control: (provided) => ({
      ...provided,
      borderRadius: '0.375rem',
      border: '1px solid #D1D5DB',
      boxShadow: 'none',
      '&:hover': {
        border: '1px solid #3B82F6',
      },
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: '#EFF6FF',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: '#1E40AF',
      fontWeight: 500,
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: '#1E40AF',
      '&:hover': {
        backgroundColor: '#DBEAFE',
        color: '#1E3A8A',
      },
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? '#2563EB' 
        : state.isFocused 
          ? '#DBEAFE' 
          : null,
      color: state.isSelected ? 'white' : '#1F2937',
      '&:active': {
        backgroundColor: '#3B82F6',
      },
    }),
  };

  return (
    <div className="card mb-8 animate-fade-in">
      <h2 className="text-xl font-heading font-semibold mb-4 text-primary-800">Select NIFTY 50 Stocks</h2>
      <Select
        isMulti
        name="stocks"
        options={nifty50Stocks}
        className="basic-multi-select"
        classNamePrefix="select"
        placeholder="Select at least 5 stocks from NIFTY 50..."
        value={selectedStocks}
        onChange={handleChange}
        styles={customStyles}
        closeMenuOnSelect={false}
      />
      {selectedStocks.length > 0 && selectedStocks.length < 5 && (
        <p className="mt-2 text-sm text-amber-600">Please select at least 5 stocks for better comparison.</p>
      )}
    </div>
  );
};

export default StockSelector;