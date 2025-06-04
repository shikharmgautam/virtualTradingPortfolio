import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const StockChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="h-full flex items-center justify-center bg-gray-50">No data available</div>;
  }

  // Get only the last 30 data points for better visualization
  const chartData = data.slice(-30);
  const latest = chartData[chartData.length - 1];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded shadow-lg border border-gray-100 text-xs">
          <p className="font-semibold">{format(new Date(data.date), 'MMM d, yyyy')}</p>
          <p className="text-gray-700">Price: <span className="font-medium">${data.close.toFixed(2)}</span></p>
          <p className="text-gray-700">MA(9): <span className="font-medium">${data.ma9.toFixed(2)}</span></p>
          <p className="text-gray-700">RSI(14): <span className="font-medium">{data.rsi.toFixed(2)}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart 
        data={chartData}
        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
      >
        <XAxis 
          dataKey="date" 
          tick={false}
          axisLine={false}
        />
        <YAxis 
          domain={['auto', 'auto']} 
          tick={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        
        {/* MA Line */}
        <Line 
          type="monotone" 
          dataKey="ma9" 
          stroke="#6366F1" 
          strokeWidth={1.5} 
          dot={false} 
          activeDot={false}
          strokeDasharray="3 3" 
        />
        
        {/* Price Line */}
        <Line 
          type="monotone" 
          dataKey="close" 
          stroke="#2563EB" 
          strokeWidth={2} 
          dot={false} 
          activeDot={{ r: 4, stroke: '#2563EB', strokeWidth: 1, fill: '#fff' }} 
        />
        
        {/* Reference line for current price */}
        <ReferenceLine y={latest.close} stroke="#94A3B8" strokeDasharray="3 3" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default StockChart;