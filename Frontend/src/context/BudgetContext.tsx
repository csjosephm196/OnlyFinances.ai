// context/BudgetContext.tsx - React context for sharing processed financial data with Firebase persistence

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { ProcessingResult } from '../types/budget';
import { BalanceSheetData } from '../types/balanceSheet';
import { IncomeStatementData } from '../types/incomeStatement';
import { useAuth } from '../hooks/useAuth';
import {
    saveBudgetHistory,
    getBudgetHistory,
    getBudgetTransactions,
    deleteBudgetHistory,
    saveBalanceSheet,
    getBalanceSheets,
    getBalanceSheetItems,
    deleteBalanceSheet,
    saveIncomeStatement,
    getIncomeStatements,
    getIncomeStatementItems,
    deleteIncomeStatement,
} from '../services/firestoreService';
import {
    BudgetHistoryWithId,
    BalanceSheetWithId,
    IncomeStatementWithId,
} from '../types/firestoreTypes';

interface BudgetContextType {
    // Current data in memory
    processingResult: ProcessingResult | null;
    setProcessingResult: (result: ProcessingResult | null) => void;
    balanceSheetData: BalanceSheetData | null;
    setBalanceSheetData: (data: BalanceSheetData | null) => void;
    incomeStatementData: IncomeStatementData | null;
    setIncomeStatementData: (data: IncomeStatementData | null) => void;
    clearData: () => void;

    // Firebase persistence functions - now accepts data directly
    saveBudgetToFirebase: (fileName: string, data: ProcessingResult) => Promise<void>;
    saveBalanceSheetToFirebase: (fileName: string, data: BalanceSheetData) => Promise<void>;
    saveIncomeStatementToFirebase: (fileName: string, data: IncomeStatementData) => Promise<void>;

    // History
    budgetHistoryList: BudgetHistoryWithId[];
    balanceSheetHistoryList: BalanceSheetWithId[];
    incomeStatementHistoryList: IncomeStatementWithId[];
    loadHistory: () => Promise<void>;
    deleteFromHistory: (id: string, type: 'budget' | 'balanceSheet' | 'incomeStatement') => Promise<void>;

    // Loading states
    isSaving: boolean;
    isLoadingHistory: boolean;
}

const BudgetContext = createContext<BudgetContextType | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();

    // Current data state
    const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
    const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData | null>(null);
    const [incomeStatementData, setIncomeStatementData] = useState<IncomeStatementData | null>(null);

    // History state
    const [budgetHistoryList, setBudgetHistoryList] = useState<BudgetHistoryWithId[]>([]);
    const [balanceSheetHistoryList, setBalanceSheetHistoryList] = useState<BalanceSheetWithId[]>([]);
    const [incomeStatementHistoryList, setIncomeStatementHistoryList] = useState<IncomeStatementWithId[]>([]);

    // Loading states
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const clearData = () => {
        setProcessingResult(null);
        setBalanceSheetData(null);
        setIncomeStatementData(null);
    };

    // Auto-load history and restore most recent data when user logs in
    useEffect(() => {
        if (!user) {
            // Clear data when user logs out
            clearData();
            setBudgetHistoryList([]);
            setBalanceSheetHistoryList([]);
            setIncomeStatementHistoryList([]);
            return;
        }

        const loadAndRestoreData = async () => {
            setIsLoadingHistory(true);
            console.log('🔄 Loading historical data for user:', user.uid);
            try {
                // Load history lists
                const [budgets, balanceSheets, incomeStatements] = await Promise.all([
                    getBudgetHistory(user.uid, 20),
                    getBalanceSheets(user.uid, 20),
                    getIncomeStatements(user.uid, 20),
                ]);
                setBudgetHistoryList(budgets);
                setBalanceSheetHistoryList(balanceSheets);
                setIncomeStatementHistoryList(incomeStatements);
                console.log(`📊 Loaded: ${budgets.length} budgets, ${balanceSheets.length} balance sheets, ${incomeStatements.length} income statements`);

                // Always restore most recent budget with transactions if available
                if (budgets.length > 0) {
                    const latestBudget = budgets[0];
                    console.log('💰 Restoring most recent budget:', latestBudget.fileName);
                    const transactions = await getBudgetTransactions(latestBudget.id);
                    console.log(`   Fetched ${transactions.length} transactions`);
                    setProcessingResult({
                        success: true,
                        total_transactions: latestBudget.totalTransactions,
                        date_range: latestBudget.dateRange,
                        summary: latestBudget.summary,
                        monthly_breakdown: latestBudget.monthlyBreakdown,
                        transactions,
                    });
                }

                // Always restore most recent balance sheet with items if available
                if (balanceSheets.length > 0) {
                    const latestBS = balanceSheets[0];
                    console.log('📋 Restoring most recent balance sheet:', latestBS.fileName);
                    const items = await getBalanceSheetItems(latestBS.id);
                    const assetItems = items.filter(item => item.type === 'asset');
                    const liabilityItems = items.filter(item => item.type === 'liability');
                    setBalanceSheetData({
                        success: true,
                        date: latestBS.date,
                        total_items: latestBS.totalItems,
                        equity: latestBS.equity,
                        assets: {
                            items: assetItems,
                            total: latestBS.assets.total,
                            by_category: latestBS.assets.byCategory,
                        },
                        liabilities: {
                            items: liabilityItems,
                            total: latestBS.liabilities.total,
                            by_category: latestBS.liabilities.byCategory,
                        },
                        items,
                    });
                }

                // Always restore most recent income statement with items if available
                if (incomeStatements.length > 0) {
                    const latestIS = incomeStatements[0];
                    console.log('📈 Restoring most recent income statement:', latestIS.fileName);
                    const items = await getIncomeStatementItems(latestIS.id);
                    const revenueItems = items.filter(item => item.type === 'revenue');
                    const expenseItems = items.filter(item => item.type === 'expense');
                    setIncomeStatementData({
                        success: true,
                        period: latestIS.period,
                        total_items: latestIS.totalItems,
                        gross_profit: latestIS.grossProfit,
                        net_income: latestIS.netIncome,
                        revenues: {
                            items: revenueItems,
                            total: latestIS.revenues.total,
                            by_category: latestIS.revenues.byCategory,
                        },
                        expenses: {
                            items: expenseItems,
                            total: latestIS.expenses.total,
                            by_category: latestIS.expenses.byCategory,
                        },
                        items,
                    });
                }

                console.log('✅ Data restoration complete');
            } catch (err) {
                console.error('Failed to load/restore historical data:', err);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        loadAndRestoreData();
    }, [user]); // Run when user changes (login/logout)

    // Save budget data to Firebase - accepts data directly
    const saveBudgetToFirebase = useCallback(async (fileName: string, data: ProcessingResult) => {
        if (!user) {
            console.log('No user logged in, skipping save');
            return;
        }
        setIsSaving(true);
        try {
            console.log('Saving budget to Firebase:', fileName, data.total_transactions, 'transactions');
            await saveBudgetHistory(user.uid, fileName, data);
            console.log('Budget saved successfully');
            // Refresh history after saving
            await loadHistory();
        } catch (err) {
            console.error('Failed to save budget to Firebase:', err);
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [user]);

    // Save balance sheet data to Firebase - accepts data directly
    const saveBalanceSheetToFirebase = useCallback(async (fileName: string, data: BalanceSheetData) => {
        if (!user) {
            console.log('No user logged in, skipping save');
            return;
        }
        setIsSaving(true);
        try {
            console.log('Saving balance sheet to Firebase:', fileName);
            await saveBalanceSheet(user.uid, fileName, data);
            console.log('Balance sheet saved successfully');
            await loadHistory();
        } catch (err) {
            console.error('Failed to save balance sheet to Firebase:', err);
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [user]);

    // Save income statement data to Firebase - accepts data directly
    const saveIncomeStatementToFirebase = useCallback(async (fileName: string, data: IncomeStatementData) => {
        if (!user) {
            console.log('No user logged in, skipping save');
            return;
        }
        setIsSaving(true);
        try {
            console.log('Saving income statement to Firebase:', fileName);
            await saveIncomeStatement(user.uid, fileName, data);
            console.log('Income statement saved successfully');
            await loadHistory();
        } catch (err) {
            console.error('Failed to save income statement to Firebase:', err);
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [user]);

    // Load all history from Firebase
    const loadHistory = useCallback(async () => {
        if (!user) return;
        setIsLoadingHistory(true);
        try {
            const [budgets, balanceSheets, incomeStatements] = await Promise.all([
                getBudgetHistory(user.uid, 20),
                getBalanceSheets(user.uid, 20),
                getIncomeStatements(user.uid, 20),
            ]);
            setBudgetHistoryList(budgets);
            setBalanceSheetHistoryList(balanceSheets);
            setIncomeStatementHistoryList(incomeStatements);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [user]);

    // Delete from history
    const deleteFromHistory = useCallback(async (id: string, type: 'budget' | 'balanceSheet' | 'incomeStatement') => {
        try {
            switch (type) {
                case 'budget':
                    await deleteBudgetHistory(id);
                    setBudgetHistoryList(prev => prev.filter(item => item.id !== id));
                    break;
                case 'balanceSheet':
                    await deleteBalanceSheet(id);
                    setBalanceSheetHistoryList(prev => prev.filter(item => item.id !== id));
                    break;
                case 'incomeStatement':
                    await deleteIncomeStatement(id);
                    setIncomeStatementHistoryList(prev => prev.filter(item => item.id !== id));
                    break;
            }
        } catch (err) {
            console.error('Failed to delete from history:', err);
            throw err;
        }
    }, []);

    return (
        <BudgetContext.Provider value={{
            processingResult,
            setProcessingResult,
            balanceSheetData,
            setBalanceSheetData,
            incomeStatementData,
            setIncomeStatementData,
            clearData,
            saveBudgetToFirebase,
            saveBalanceSheetToFirebase,
            saveIncomeStatementToFirebase,
            budgetHistoryList,
            balanceSheetHistoryList,
            incomeStatementHistoryList,
            loadHistory,
            deleteFromHistory,
            isSaving,
            isLoadingHistory,
        }}>
            {children}
        </BudgetContext.Provider>
    );
}

export function useBudget() {
    const context = useContext(BudgetContext);
    if (!context) {
        throw new Error('useBudget must be used within a BudgetProvider');
    }
    return context;
}
