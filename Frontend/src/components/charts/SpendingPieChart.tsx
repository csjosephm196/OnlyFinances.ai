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
                <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                    <p className="font-semibold text-slate-900">
                        {data.icon} {data.name}
                    </p>
                    <p className="text-slate-600">
                        ${data.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-400">{percentage}% of total</p>
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
            <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <span className="text-slate-400 text-sm font-medium">No spending data available</span>
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
                        formatter={(value: string) => (
                            <span className="text-sm text-slate-700">{value}</span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-4">
                <p className="text-sm text-slate-500">Total Spending</p>
                <p className="text-2xl font-bold text-slate-900">
                    ${totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
            </div>
        </div>
    );
}
