// components/charts/SpendingPieChart.tsx - Pie chart for spending breakdown by category

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { SpendingCategory } from '../../types/budget';
import { CATEGORY_DISPLAY } from '../../constants/categories';

interface SpendingPieChartProps {
    summary: Record<SpendingCategory, number>;
}

export function SpendingPieChart({ summary }: SpendingPieChartProps) {
    // Transform summary data for the pie chart, filtering out zero values
    const chartData = Object.entries(summary)
        .filter(([_, amount]) => amount > 0)
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
            <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={renderCustomLabel}
                        labelLine={false}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        formatter={(value: string) => {
                            const data = chartData.find(d => d.name === value);
                            return (
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    {data?.icon} {value}
                                </span>
                            );
                        }}
                        wrapperStyle={{ fontSize: '14px', fontWeight: '500' }}
                    />
                </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Spending</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    ${totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
            </div>
            {/* Category List Below Chart - Makes all categories visible */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">All Categories</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {chartData.map((entry, index) => {
                        const percentage = ((entry.value / totalSpending) * 100).toFixed(1);
                        return (
                            <div key={index} className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-600 shadow-sm">
                                <div 
                                    className="w-4 h-4 rounded flex-shrink-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                        {entry.icon} {entry.name}
                                    </p>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                                        ${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({percentage}%)
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
