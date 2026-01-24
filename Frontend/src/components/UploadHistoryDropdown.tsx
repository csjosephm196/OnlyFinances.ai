// components/UploadHistoryDropdown.tsx - Dropdown menu for viewing previously uploaded sheets

import React, { useState, useRef, useEffect } from 'react';
import { History, ChevronDown, FileText, Layers, BarChart3, Loader2 } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { getBudgetTransactions, getBalanceSheetItems, getIncomeStatementItems } from '../services/firestoreService';
import { BudgetHistoryWithId, BalanceSheetWithId, IncomeStatementWithId } from '../types/firestoreTypes';
import { Timestamp } from 'firebase/firestore';

type SheetType = 'transactions' | 'balancesheet' | 'incomestatement';

interface UnifiedHistoryItem {
    id: string;
    type: SheetType;
    fileName: string;
    uploadedAt: Timestamp;
    // Original data for restoring
    original: BudgetHistoryWithId | BalanceSheetWithId | IncomeStatementWithId;
}

interface UploadHistoryDropdownProps {
    onSelect?: (type: SheetType) => void;
}

export function UploadHistoryDropdown({ onSelect }: UploadHistoryDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const {
        budgetHistoryList,
        balanceSheetHistoryList,
        incomeStatementHistoryList,
        isLoadingHistory,
        setProcessingResult,
        setBalanceSheetData,
        setIncomeStatementData,
    } = useBudget();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Merge and sort all history items
    const unifiedHistory: UnifiedHistoryItem[] = [
        ...budgetHistoryList.map(item => ({
            id: item.id,
            type: 'transactions' as SheetType,
            fileName: item.fileName,
            uploadedAt: item.uploadedAt,
            original: item,
        })),
        ...balanceSheetHistoryList.map(item => ({
            id: item.id,
            type: 'balancesheet' as SheetType,
            fileName: item.fileName,
            uploadedAt: item.uploadedAt,
            original: item,
        })),
        ...incomeStatementHistoryList.map(item => ({
            id: item.id,
            type: 'incomestatement' as SheetType,
            fileName: item.fileName,
            uploadedAt: item.uploadedAt,
            original: item,
        })),
    ].sort((a, b) => b.uploadedAt.toMillis() - a.uploadedAt.toMillis());

    const getTypeConfig = (type: SheetType) => {
        switch (type) {
            case 'transactions':
                return { icon: FileText, label: 'Transaction', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
            case 'balancesheet':
                return { icon: Layers, label: 'Balance Sheet', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' };
            case 'incomestatement':
                return { icon: BarChart3, label: 'Income Statement', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' };
        }
    };

    const formatDate = (timestamp: Timestamp) => {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const handleItemClick = async (item: UnifiedHistoryItem) => {
        setIsLoading(true);
        try {
            if (item.type === 'transactions') {
                const budget = item.original as BudgetHistoryWithId;
                const transactions = await getBudgetTransactions(budget.id);
                setProcessingResult({
                    success: true,
                    total_transactions: budget.totalTransactions,
                    date_range: budget.dateRange,
                    summary: budget.summary,
                    monthly_breakdown: budget.monthlyBreakdown,
                    transactions,
                });
            } else if (item.type === 'balancesheet') {
                const bs = item.original as BalanceSheetWithId;
                const items = await getBalanceSheetItems(bs.id);
                const assetItems = items.filter(i => i.type === 'asset');
                const liabilityItems = items.filter(i => i.type === 'liability');
                setBalanceSheetData({
                    success: true,
                    date: bs.date,
                    total_items: bs.totalItems,
                    equity: bs.equity,
                    assets: {
                        items: assetItems,
                        total: bs.assets.total,
                        by_category: bs.assets.byCategory,
                    },
                    liabilities: {
                        items: liabilityItems,
                        total: bs.liabilities.total,
                        by_category: bs.liabilities.byCategory,
                    },
                    items,
                });
            } else if (item.type === 'incomestatement') {
                const is = item.original as IncomeStatementWithId;
                const items = await getIncomeStatementItems(is.id);
                const revenueItems = items.filter(i => i.type === 'revenue');
                const expenseItems = items.filter(i => i.type === 'expense');
                setIncomeStatementData({
                    success: true,
                    period: is.period,
                    total_items: is.totalItems,
                    gross_profit: is.grossProfit,
                    net_income: is.netIncome,
                    revenues: {
                        items: revenueItems,
                        total: is.revenues.total,
                        by_category: is.revenues.byCategory,
                    },
                    expenses: {
                        items: expenseItems,
                        total: is.expenses.total,
                        by_category: is.expenses.byCategory,
                    },
                    items,
                });
            }

            // Switch to the appropriate tab
            onSelect?.(item.type);
            setIsOpen(false);
        } catch (err) {
            console.error('Failed to load historical data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const totalCount = unifiedHistory.length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoadingHistory}
                className={`
                    flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                    hover:bg-slate-200 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600
                    text-slate-700 dark:text-slate-300
                    ${isOpen ? 'ring-2 ring-indigo-500/50' : ''}
                `}
            >
                {isLoadingHistory ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                    <History className="w-4 h-4 mr-1.5" />
                )}
                <span className="hidden sm:inline">History</span>
                {totalCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full">
                        {totalCount}
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Upload History</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {totalCount} saved {totalCount === 1 ? 'sheet' : 'sheets'}
                        </p>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {isLoading && (
                            <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 flex items-center justify-center z-10">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                            </div>
                        )}

                        {unifiedHistory.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <History className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                                <p className="text-sm text-slate-500 dark:text-slate-400">No uploads yet</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                    Upload a CSV to get started
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {unifiedHistory.map((item) => {
                                    const config = getTypeConfig(item.type);
                                    const Icon = config.icon;

                                    return (
                                        <li key={`${item.type}-${item.id}`}>
                                            <button
                                                onClick={() => handleItemClick(item)}
                                                className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                                            >
                                                <div className={`p-2 rounded-lg ${config.bg}`}>
                                                    <Icon className={`w-4 h-4 ${config.color}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                                        {item.fileName}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-xs font-medium ${config.color}`}>
                                                            {config.label}
                                                        </span>
                                                        <span className="text-xs text-slate-400 dark:text-slate-500">
                                                            •
                                                        </span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                                            {formatDate(item.uploadedAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
