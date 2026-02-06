// components/IncomeStatementDashboard.tsx - Dashboard view for income statement analysis

import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Percent, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { IncomeStatementData, RevenueCategory, ExpenseCategory } from '../types/incomeStatement';
import { REVENUE_DISPLAY, EXPENSE_DISPLAY } from '../constants/categories';

interface IncomeStatementDashboardProps {
    data: IncomeStatementData;
    highlightedElement?: string | null;
    revenueChartRef?: React.RefObject<HTMLDivElement | null>;
    expenseChartRef?: React.RefObject<HTMLDivElement | null>;
}

// No local display constants needed anymore

export function IncomeStatementDashboard({
    data,
    highlightedElement,
    revenueChartRef,
    expenseChartRef
}: IncomeStatementDashboardProps) {
    const profitMargin = data.revenues.total > 0
        ? ((data.net_income / data.revenues.total) * 100).toFixed(1)
        : '0.0';

    const grossMargin = data.revenues.total > 0
        ? ((data.gross_profit / data.revenues.total) * 100).toFixed(1)
        : '0.0';

    // Prepare revenue chart data
    const revenueChartData = Object.entries(data.revenues.by_category)
        .filter(([_, amount]) => amount > 0)
        .map(([category, amount]) => ({
            name: REVENUE_DISPLAY[category as RevenueCategory]?.label || category,
            value: amount,
            color: REVENUE_DISPLAY[category as RevenueCategory]?.color || '#6B7280',
            icon: REVENUE_DISPLAY[category as RevenueCategory]?.icon || '💰',
        }))
        .sort((a, b) => b.value - a.value);

    // Prepare expense chart data
    const expenseChartData = Object.entries(data.expenses.by_category)
        .filter(([_, amount]) => amount > 0)
        .map(([category, amount]) => ({
            name: EXPENSE_DISPLAY[category as ExpenseCategory]?.label || category,
            value: amount,
            color: EXPENSE_DISPLAY[category as ExpenseCategory]?.color || '#6B7280',
            icon: EXPENSE_DISPLAY[category as ExpenseCategory]?.icon || '📋',
        }))
        .sort((a, b) => b.value - a.value);

    return (
        <div className="space-y-8">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Revenue"
                    value={`$${data.revenues.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    subtitle={`${revenueChartData.length} revenue sources`}
                    icon={TrendingUp}
                    color="emerald"
                    isPositive={true}
                />
                <MetricCard
                    title="Total Expenses"
                    value={`$${data.expenses.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    subtitle={`${expenseChartData.length} expense categories`}
                    icon={TrendingDown}
                    color="rose"
                    isPositive={false}
                />
                <MetricCard
                    title="Gross Profit"
                    value={`$${data.gross_profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    subtitle={`${grossMargin}% gross margin`}
                    icon={BarChart3}
                    color="amber"
                    isPositive={data.gross_profit >= 0}
                />
                <MetricCard
                    title="Net Income"
                    value={`$${Math.abs(data.net_income).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    subtitle={`${profitMargin}% profit margin`}
                    icon={DollarSign}
                    color="amber"
                    isPositive={data.net_income >= 0}
                    highlight
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Breakdown */}
                <div
                    id="revenue-breakdown"
                    ref={revenueChartRef}
                    className={`bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-800 dark:to-emerald-950/20 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 transition-all duration-300 ${highlightedElement === 'revenue-breakdown' ? 'ring-4 ring-emerald-400 ring-offset-4' : ''}`}
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center">
                            <TrendingUp className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                            Revenue by Category
                        </h3>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            +${data.revenues.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <CategoryPieChart
                        data={revenueChartData}
                        total={data.revenues.total}
                        emptyMessage="No revenue data available"
                        accentColor="emerald"
                    />
                </div>

                {/* Expense Breakdown */}
                <div
                    id="expense-breakdown"
                    ref={expenseChartRef}
                    className={`bg-gradient-to-br from-slate-50 to-rose-50/30 dark:from-slate-800 dark:to-rose-950/20 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 transition-all duration-300 ${highlightedElement === 'expense-breakdown' ? 'ring-4 ring-rose-400 ring-offset-4' : ''}`}
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center">
                            <TrendingDown className="w-5 h-5 mr-2 text-rose-600 dark:text-rose-400" />
                            Expenses by Category
                        </h3>
                        <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
                            -${data.expenses.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <CategoryPieChart
                        data={expenseChartData}
                        total={data.expenses.total}
                        emptyMessage="No expense data available"
                        accentColor="rose"
                    />
                </div>
            </div>

            {/* Revenue Breakdown List */}
            <div
                id="revenue-details"
                className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 transition-all duration-300 ${highlightedElement === 'revenue-details' ? 'ring-4 ring-emerald-400 ring-offset-4' : ''}`}
            >
                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-6 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                    Revenue Breakdown
                </h3>
                <CategoryBreakdownList
                    data={revenueChartData}
                    total={data.revenues.total}
                    type="revenue"
                />
            </div>

            {/* Expense Breakdown List */}
            <div
                id="expense-details"
                className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 transition-all duration-300 ${highlightedElement === 'expense-details' ? 'ring-4 ring-rose-400 ring-offset-4' : ''}`}
            >
                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-6 flex items-center">
                    <TrendingDown className="w-5 h-5 mr-2 text-rose-600 dark:text-rose-400" />
                    Expense Breakdown
                </h3>
                <CategoryBreakdownList
                    data={expenseChartData}
                    total={data.expenses.total}
                    type="expense"
                />
            </div>

            {/* Financial Summary */}
            <div className="bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-amber-950/30 dark:to-emerald-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
                    <Percent className="w-5 h-5 mr-2 text-amber-600 dark:text-amber-400" />
                    Financial Performance Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Gross Margin</p>
                        <p className={`text-2xl font-bold ${parseFloat(grossMargin) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {grossMargin}%
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Revenue after COGS</p>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Net Profit Margin</p>
                        <p className={`text-2xl font-bold ${parseFloat(profitMargin) >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {profitMargin}%
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">After all expenses</p>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Expense Ratio</p>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {data.revenues.total > 0 ? ((data.expenses.total / data.revenues.total) * 100).toFixed(1) : '0.0'}%
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Expenses vs Revenue</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Metric Card Component
function MetricCard({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    isPositive,
    highlight
}: {
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ElementType;
    color: string;
    isPositive?: boolean;
    highlight?: boolean;
}) {
    const colorClasses: Record<string, string> = {
        emerald: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400",
        rose: "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400",
        amber: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400",
        teal: "bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400",
    };

    const valueColorClasses: Record<string, string> = {
        emerald: "text-emerald-600 dark:text-emerald-400",
        rose: "text-rose-600 dark:text-rose-400",
        amber: isPositive ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400",
        teal: isPositive ? "text-teal-600 dark:text-teal-400" : "text-rose-600 dark:text-rose-400",
    };

    return (
        <div className={`p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow ${highlight
            ? 'bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-amber-950/30 dark:to-emerald-950/30 border-amber-200 dark:border-amber-800'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-lg ${colorClasses[color] || "bg-slate-50 text-slate-600"}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {isPositive !== undefined && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPositive
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                        }`}>
                        {isPositive ? '+' : '-'}
                    </span>
                )}
            </div>
            <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
                <h3 className={`text-2xl font-bold mt-1 ${valueColorClasses[color] || 'text-slate-900 dark:text-slate-100'}`}>
                    {isPositive === false && !value.startsWith('-') ? '-' : ''}{value}
                </h3>
                {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
            </div>
        </div>
    );
}

// Category Pie Chart Component
function CategoryPieChart({
    data,
    total,
    emptyMessage,
    accentColor
}: {
    data: Array<{ name: string; value: number; color: string; icon: string }>;
    total: number;
    emptyMessage: string;
    accentColor: 'emerald' | 'rose';
}) {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.icon} {item.name}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                        ${item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-400">{percentage}% of total</p>
                </div>
            );
        }
        return null;
    };

    if (data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center bg-transparent rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">{emptyMessage}</span>
            </div>
        );
    }

    return (
        <div className="w-full">
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ percent }) => percent >= 0.05 ? `${(percent * 100).toFixed(0)}%` : null}
                        labelLine={false}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
                <p className={`text-xl font-bold ${accentColor === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
            </div>
        </div>
    );
}

// Category Breakdown List Component
function CategoryBreakdownList({
    data,
    total,
    type
}: {
    data: Array<{ name: string; value: number; color: string; icon: string }>;
    total: number;
    type: 'revenue' | 'expense';
}) {
    if (data.length === 0) {
        return (
            <p className="text-slate-400 dark:text-slate-500 text-center py-8">
                No {type} data available
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {data.map((item, index) => {
                const percentage = total > 0 ? (item.value / total) * 100 : 0;
                return (
                    <div
                        key={index}
                        className="flex items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors border border-slate-200 dark:border-slate-700"
                    >
                        <span className="text-2xl mr-4 flex-shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-base text-slate-900 dark:text-slate-100">
                                    {item.name}
                                </span>
                                <span className={`font-bold text-lg ml-4 ${type === 'revenue'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                    {type === 'revenue' ? '+' : '-'}${item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 shadow-inner">
                                <div
                                    className="h-3 rounded-full transition-all duration-500 shadow-sm"
                                    style={{ width: `${percentage}%`, backgroundColor: item.color }}
                                />
                            </div>
                        </div>
                        <span className="ml-4 text-base font-semibold text-slate-600 dark:text-slate-300 w-14 text-right flex-shrink-0">
                            {percentage.toFixed(1)}%
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
