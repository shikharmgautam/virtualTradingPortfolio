import React from 'react';
import ThemeToggle from './ThemeToggle';

const Header = () => {
  return (
    <header className="bg-primary-800 dark:bg-dark-100 text-white shadow-md dark:border-b dark:border-dark-200">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 mr-3 text-primary-400 dark:text-primary-500">
            <path fillRule="evenodd" d="M3.75 3a.75.75 0 00-.75.75v10.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5zM9 3A.75.75 0 008.25 3.75v14.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 0010.5 3H9zM14.25 3a.75.75 0 00-.75.75v10.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5zM19.5 3a.75.75 0 00-.75.75v1.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75v-1.5a.75.75 0 00-.75-.75h-1.5z" clipRule="evenodd" />
          </svg>
          <div>
            <h1 className="text-xl md:text-2xl font-heading font-bold">NIFTY 50 Screener</h1>
            <p className="text-xs text-primary-200 dark:text-gray-300 hidden md:block">Technical Analysis & Signal Generation</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="text-sm py-1 px-3 rounded border border-primary-400 dark:border-dark-300 dark:text-gray-200 hover:bg-primary-700 dark:hover:bg-dark-200 transition-colors duration-200">
            <span className="hidden md:inline">Market</span> Overview
          </button>
          <button className="text-sm py-1 px-3 rounded bg-primary-600 dark:bg-dark-200 dark:text-gray-200 hover:bg-primary-700 dark:hover:bg-dark-300 transition-colors duration-200">
            <span className="hidden md:inline">My</span> Watchlist
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;