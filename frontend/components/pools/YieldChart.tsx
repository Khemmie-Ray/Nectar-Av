"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface YieldChartProps {
  startTime: number;
  endTime: number;
  totalDeposited: bigint;
  pendingProfit: bigint;
  decimals?: number;
}

export default function YieldChart({
  startTime,
  endTime,
  totalDeposited,
  pendingProfit,
  decimals = 6,
}: YieldChartProps) {
  const chartData = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const duration = endTime - startTime;
    const elapsed = Math.min(now - startTime, duration);
    const progress = elapsed / duration;

    const deposited = Number(totalDeposited) / Math.pow(10, decimals);
    const profit = Number(pendingProfit) / Math.pow(10, decimals);

    const points = [];
    const numPoints = 10;

    for (let i = 0; i <= numPoints; i++) {
      const ratio = i / numPoints;
      const timestamp = startTime + (duration * ratio);
      const date = new Date(timestamp * 1000);
      
      let accumulatedYield = 0;
      let currentDeposit = 0;

      if (ratio <= progress) {
        accumulatedYield = profit * ratio / progress;
        currentDeposit = deposited * ratio / progress;
      } else {
        const projectedYield = profit / progress; // Total expected yield
        accumulatedYield = projectedYield * ratio;
        currentDeposit = deposited;
      }

      points.push({
        name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        timestamp,
        deposit: currentDeposit,
        yield: accumulatedYield,
        total: currentDeposit + accumulatedYield,
        isProjected: ratio > progress,
      });
    }

    return points;
  }, [startTime, endTime, totalDeposited, pendingProfit, decimals]);

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-xs text-gray-600 mb-2">{data.name}</p>
          <div className="space-y-1">
            <p className="text-xs">
              <span className="text-blue-600 font-semibold">Deposits: </span>
              <span className="text-gray-800">{formatCurrency(data.deposit)}</span>
            </p>
            <p className="text-xs">
              <span className="text-green-600 font-semibold">Yield: </span>
              <span className="text-gray-800">{formatCurrency(data.yield)}</span>
            </p>
            <p className="text-xs font-semibold border-t pt-1 mt-1">
              <span className="text-gray-700">Total: </span>
              <span className="text-gray-900">{formatCurrency(data.total)}</span>
            </p>
            {data.isProjected && (
              <p className="text-[9px] text-orange-500 italic mt-1">* Projected</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorDeposit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: '#6B7280' }}
          stroke="#D1D5DB"
        />
        
        <YAxis
          tickFormatter={formatCurrency}
          tick={{ fontSize: 10, fill: '#6B7280' }}
          stroke="#D1D5DB"
        />
        
        <Tooltip content={<CustomTooltip />} />
        
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
          iconType="circle"
        />
        
        <Area
          type="monotone"
          dataKey="deposit"
          stackId="1"
          stroke="#3B82F6"
          fill="url(#colorDeposit)"
          name="Deposits"
          strokeWidth={2}
        />
        
        <Area
          type="monotone"
          dataKey="yield"
          stackId="1"
          stroke="#10B981"
          fill="url(#colorYield)"
          name="Yield"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}