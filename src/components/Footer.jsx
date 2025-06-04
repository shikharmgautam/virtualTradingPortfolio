import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-100 dark:bg-dark-100 border-t border-gray-200 dark:border-dark-200 py-4 mt-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-600 dark:text-gray-300">
          <p>© {new Date().getFullYear()} NIFTY 50 Stock Screener. All Rights Reserved.</p>
          <div className="mt-2 md:mt-0">
            <ul className="flex space-x-4">
              <li><a href="#" className="hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 transition-colors">Disclaimer</a></li>
              <li><a href="#" className="hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 transition-colors">Terms</a></li>
              <li><a href="#" className="hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 transition-colors">Privacy</a></li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          This application is for educational purposes only. Do not make investment decisions based solely on this information.
        </p>
      </div>
    </footer>
  );
};

export default Footer;