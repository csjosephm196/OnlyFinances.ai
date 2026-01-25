// components/charts/SpendingPieChart.tsx - Pie chart for spending breakdown by category

import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { SpendingCategory } from '../../types/budget';
import { CATEGORY_DISPLAY } from '../../constants/categories';

interface SpendingPieChartProps {
    summary: Record<SpendingCategory, number>;
}

export function SpendingPieChart({ summary }: SpendingPieChartProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    
    // Transform summary data for the pie chart, filtering out zero values
    // Use Math.abs() to handle both positive (income) and negative (expense) amounts
    const chartData = Object.entries(summary)
        .filter(([_, amount]) => amount !== 0)
        .map(([category, amount]) => ({
            name: CATEGORY_DISPLAY[category as SpendingCategory]?.label || category,
            value: Math.abs(amount),
            color: CATEGORY_DISPLAY[category as SpendingCategory]?.color || '#9CA3AF',
            icon: CATEGORY_DISPLAY[category as SpendingCategory]?.icon || '❓',
        }))
        .sort((a, b) => b.value - a.value);

    const totalSpending = chartData.reduce((sum, item) => sum + item.value, 0);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const percentage = ((data.value / totalSpending) * 100).toFixed(1);
            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {data.icon} {data.name}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                        ${data.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-400 dark:text-slate-400">{percentage}% of total</p>
                </div>
            );
        }
        return null;
    };

    const renderCustomLabel = ({ name, percent }: any) => {
        if (percent < 0.05) return null; // Don't show labels for very small slices
        return `${(percent * 100).toFixed(0)}%`;
    };

    if (chartData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center bg-transparent rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">No spending data available</span>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="flex items-center justify-between gap-6">
                {/* Pie Chart */}
                <div className="relative flex-shrink-0" style={{ width: '280px', height: '280px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={75}
                                outerRadius={115}
                                paddingAngle={2}
                                dataKey="value"
                                labelLine={false}
                                onMouseEnter={(_, index) => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(null)}
                            >
                                {chartData.map((entry, index) => {
                                    const isActive = activeIndex === index;
                                    // Lighten color on hover by adding opacity or brightness
                                    const fillColor = isActive 
                                        ? `${entry.color}dd` // Slightly lighter by adding opacity
                                        : entry.color;
                                    return (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={fillColor}
                                            stroke={isActive ? '#ffffff' : 'transparent'}
                                            strokeWidth={isActive ? 3 : 0}
                                            style={{
                                                filter: isActive ? 'brightness(1.15) drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        />
                                    );
                                })}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center text overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
                        <div className="text-center">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Spending</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                ${totalSpending.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Legend */}
                <div className="flex-1 space-y-1 relative z-10">
                    {chartData.map((entry, index) => {
                        return (
                            <div key={index} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors relative">
                                <div 
                                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                    {entry.icon} {entry.name}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
