// components/charts/MonthlyTrendChart.tsx - Bar chart for monthly spending trends

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { SpendingCategory } from '../../types/budget';
import { CATEGORY_DISPLAY } from '../../constants/categories';

interface MonthlyTrendChartProps {
    monthlyBreakdown: Record<string, Record<SpendingCategory, number>>;
}

export function MonthlyTrendChart({ monthlyBreakdown }: MonthlyTrendChartProps) {
    // Transform data for the bar chart
    const months = Object.keys(monthlyBreakdown).sort();

    const chartData = months.map(month => {
        const categories = monthlyBreakdown[month];
        const total = Object.values(categories).reduce((sum, val) => sum + Math.abs(val), 0);

        // Format month for display (YYYY-MM -> MMM YYYY)
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        const formattedMonth = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

        return {
            month: formattedMonth,
            total,
            ...Object.entries(categories).reduce((acc, [cat, val]) => ({
                ...acc,
                [cat]: Math.abs(val)
            }), {})
        };
    });

    // Get top 5 categories by total spending across all months
    const categoryTotals: Record<string, number> = {};
    Object.values(monthlyBreakdown).forEach(categories => {
        Object.entries(categories).forEach(([cat, val]) => {
            categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(val);
        });
    });

    const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat]) => cat) as SpendingCategory[];

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
            return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200 min-w-[180px]">
                    <p className="font-semibold text-slate-900 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center text-sm py-0.5">
                            <span className="flex items-center">
                                <span
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: entry.color }}
                                />
                                {CATEGORY_DISPLAY[entry.dataKey as SpendingCategory]?.label || entry.dataKey}
                            </span>
                            <span className="font-medium text-slate-700">
                                ${entry.value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    ))}
                    <div className="border-t border-slate-100 mt-2 pt-2 flex justify-between">
                        <span className="font-semibold text-slate-900">Total</span>
                        <span className="font-bold text-slate-900">
                            ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (chartData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center bg-transparent rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">No monthly data available</span>
            </div>
        );
    }

    return (
        <div className="w-full">
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                        dataKey="month"
                        tick={{ fill: '#64748B', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#E2E8F0' }}
                    />
                    <YAxis
                        tick={{ fill: '#64748B', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#E2E8F0' }}
                        tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value: string) => (
                            <span className="text-sm text-slate-700">
                                {CATEGORY_DISPLAY[value as SpendingCategory]?.label || value}
                            </span>
                        )}
                    />
                    {topCategories.map((category) => (
                        <Bar
                            key={category}
                            dataKey={category}
                            stackId="spending"
                            fill={CATEGORY_DISPLAY[category]?.color || '#9CA3AF'}
                            radius={[4, 4, 0, 0]}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
