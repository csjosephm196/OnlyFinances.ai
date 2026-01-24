// context/BudgetContext.tsx - React context for sharing processed financial data with Firebase persistence

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ProcessingResult } from '../types/budget';
import { BalanceSheetData } from '../types/balanceSheet';
import { IncomeStatementData } from '../types/incomeStatement';
import { useAuth } from '../hooks/useAuth';
import {
    saveBudgetHistory,
    getBudgetHistory,
    deleteBudgetHistory,
    saveBalanceSheet,
    getBalanceSheets,
    deleteBalanceSheet,
    saveIncomeStatement,
    getIncomeStatements,
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

    // Firebase persistence functions
    saveToFirebase: (fileName: string, type: 'budget' | 'balanceSheet' | 'incomeStatement') => Promise<void>;

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

    // Save current data to Firebase
    const saveToFirebase = useCallback(async (fileName: string, type: 'budget' | 'balanceSheet' | 'incomeStatement') => {
        if (!user) return;
        setIsSaving(true);
        try {
            switch (type) {
                case 'budget':
                    if (processingResult) {
                        await saveBudgetHistory(user.uid, fileName, processingResult);
                    }
                    break;
                case 'balanceSheet':
                    if (balanceSheetData) {
                        await saveBalanceSheet(user.uid, fileName, balanceSheetData);
                    }
                    break;
                case 'incomeStatement':
                    if (incomeStatementData) {
                        await saveIncomeStatement(user.uid, fileName, incomeStatementData);
                    }
                    break;
            }
            // Refresh history after saving
            await loadHistory();
        } catch (err) {
            console.error('Failed to save to Firebase:', err);
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [user, processingResult, balanceSheetData, incomeStatementData]);

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
            saveToFirebase,
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
