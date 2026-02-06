// components/RecurringExpensesCard.tsx - Display detected recurring subscriptions/bills

import React, { useEffect, useState } from 'react';
import { RefreshCw, Calendar, DollarSign, TrendingDown, AlertCircle, Loader2 } from 'lucide-react';
import { RecurringExpense, RecurringExpensesResult } from '../types/recurringExpense';
import { CategorizedTransaction } from '../types/budget';
import { detectRecurringExpenses } from '../services/budgetApi';
import { CATEGORY_DISPLAY } from '../constants/categories';
import { SpendingCategory } from '../types/budget';

// Frequency display labels
const FREQUENCY_LABELS: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
};

// Frequency badge colors
const FREQUENCY_COLORS: Record<string, string> = {
    weekly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    biweekly: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    monthly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    quarterly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    yearly: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

interface RecurringExpensesCardProps {
    transactions: CategorizedTransaction[];
}

export function RecurringExpensesCard({ transactions }: RecurringExpensesCardProps) {
    const [data, setData] = useState<RecurringExpensesResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRecurringExpenses = async () => {
        if (transactions.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            const result = await detectRecurringExpenses(transactions);
            if (result.success) {
                setData(result);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Failed to detect recurring expenses');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecurringExpenses();
    }, [transactions]);

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Days until next charge
    const daysUntil = (dateStr: string) => {
        const now = new Date();
        const next = new Date(dateStr);
        const diff = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    // If no transactions, don't render
    if (transactions.length === 0) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg mr-3">
                        <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                            Recurring Expenses
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Detected subscriptions & bills
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchRecurringExpenses}
                    disabled={loading}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Loading State */}
            {loading && !data && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    <span className="ml-3 text-slate-500">Analyzing transactions...</span>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="flex items-center justify-center py-8 text-rose-500">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span>{error}</span>
                </div>
            )}

            {/* No Recurring Expenses Found */}
            {data && data.total_detected === 0 && (
                <div className="text-center py-8">
                    <RefreshCw className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">
                        No recurring expenses detected yet.
                    </p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                        Upload more transaction history to detect patterns.
                    </p>
                </div>
            )}

            {/* Summary Stats */}
            {data && data.total_detected > 0 && (
                <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-amber-950/30 dark:to-emerald-950/30 rounded-lg p-4 border border-amber-100 dark:border-amber-900/50">
                            <div className="flex items-center mb-1">
                                <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400 mr-1" />
                                <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">Monthly Total</span>
                            </div>
                            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                                ${data.monthly_total.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center mb-1">
                                <RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-400 mr-1" />
                                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Subscriptions</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {data.total_detected}
                            </p>
                        </div>
                    </div>

                    {/* Recurring Expenses List */}
                    <div className="space-y-3">
                        {data.recurring_expenses.map((expense, index) => {
                            const categoryDisplay = CATEGORY_DISPLAY[expense.category as SpendingCategory];
                            const days = daysUntil(expense.next_expected);
                            const isUpcoming = days >= 0 && days <= 7;

                            return (
                                <div
                                    key={index}
                                    className={`flex items-center p-3 rounded-lg border transition-colors ${isUpcoming
                                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                                        }`}
                                >
                                    {/* Category Icon */}
                                    <span className="text-2xl mr-3 flex-shrink-0">
                                        {categoryDisplay?.icon || '🔄'}
                                    </span>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                {expense.merchant}
                                            </span>
                                            <span className="font-bold text-lg text-slate-900 dark:text-slate-100 ml-2 flex-shrink-0">
                                                ${expense.amount.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-sm">
                                            {/* Frequency Badge */}
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FREQUENCY_COLORS[expense.frequency] || 'bg-slate-100 text-slate-600'}`}>
                                                {FREQUENCY_LABELS[expense.frequency] || expense.frequency}
                                            </span>

                                            {/* Next Charge */}
                                            <span className="flex items-center ml-3 text-slate-500 dark:text-slate-400">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {days < 0 ? (
                                                    <span>Expected {formatDate(expense.next_expected)}</span>
                                                ) : days === 0 ? (
                                                    <span className="text-amber-600 dark:text-amber-400 font-medium">Due today</span>
                                                ) : days <= 7 ? (
                                                    <span className="text-amber-600 dark:text-amber-400 font-medium">In {days} days</span>
                                                ) : (
                                                    <span>Next: {formatDate(expense.next_expected)}</span>
                                                )}
                                            </span>

                                            {/* Occurrences */}
                                            <span className="ml-3 text-slate-400 dark:text-slate-500">
                                                {expense.occurrences}x detected
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Annual Estimate */}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center">
                                <TrendingDown className="w-4 h-4 mr-1" />
                                Estimated annual cost
                            </span>
                            <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
                                ${(data.monthly_total * 12).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
