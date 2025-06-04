import React from 'react';
import StockSelector from './components/StockSelector';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import { StockProvider } from './contexts/StockContext';
import { PortfolioProvider } from './contexts/PortfolioContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  return (
    <ThemeProvider>
      <StockProvider>
        <PortfolioProvider>
          <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-50 text-gray-900 dark:text-gray-100">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-6">
              <div className="max-w-7xl mx-auto">
                <Portfolio />
                <StockSelector />
                <Dashboard />
              </div>
            </main>
            <Footer />
          </div>
        </PortfolioProvider>
      </StockProvider>
    </ThemeProvider>
  );
}

export default App