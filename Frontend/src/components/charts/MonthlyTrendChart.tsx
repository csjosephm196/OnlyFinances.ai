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
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 min-w-[180px]">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center text-sm py-0.5">
                            <span className="flex items-center">
                                <span
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-slate-700 dark:text-slate-300">
                                    {CATEGORY_DISPLAY[entry.dataKey as SpendingCategory]?.label || entry.dataKey}
                                </span>
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                ${entry.value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    ))}
                    <div className="border-t border-slate-100 dark:border-slate-600 mt-2 pt-2 flex justify-between">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">Total</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
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

    // Calculate monthly statistics
    const avgMonthlySpending = chartData.reduce((sum, m) => sum + m.total, 0) / chartData.length;
    const highestMonth = chartData.reduce((max, m) => m.total > max.total ? m : max, chartData[0]);
    const lowestMonth = chartData.reduce((min, m) => m.total < min.total ? m : min, chartData[0]);
    
    // Calculate trend
    const firstHalf = chartData.slice(0, Math.ceil(chartData.length / 2));
    const secondHalf = chartData.slice(Math.ceil(chartData.length / 2));
    const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.total, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.total, 0) / secondHalf.length;
    const trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    return (
        <div className="w-full space-y-4">
            {/* Statistics Row */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/40 dark:bg-slate-700/40 rounded-lg p-3 border border-slate-200/50 dark:border-slate-600/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Avg Monthly</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        ${avgMonthlySpending.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                </div>
                <div className="bg-white/40 dark:bg-slate-700/40 rounded-lg p-3 border border-rose-200/50 dark:border-rose-800/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Highest</p>
                    <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                        ${highestMonth.total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{highestMonth.month}</p>
                </div>
                <div className="bg-white/40 dark:bg-slate-700/40 rounded-lg p-3 border border-emerald-200/50 dark:border-emerald-800/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Lowest</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        ${lowestMonth.total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{lowestMonth.month}</p>
                </div>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" className="dark:stroke-slate-700" />
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
                        wrapperStyle={{ paddingTop: '16px' }}
                        iconSize={10}
                        formatter={(value: string) => (
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
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

            {/* Trend Insight */}
            {chartData.length >= 2 && (
                <div className="bg-white/40 dark:bg-slate-700/40 rounded-lg p-3 border border-slate-200/50 dark:border-slate-600/50">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-400">Overall Trend</span>
                        <div className="flex items-center gap-2">
                            {trendPercentage > 0 ? (
                                <>
                                    <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                                        ↑ {Math.abs(trendPercentage).toFixed(1)}%
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">spending increase</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                        ↓ {Math.abs(trendPercentage).toFixed(1)}%
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">spending decrease</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
