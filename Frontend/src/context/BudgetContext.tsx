// context/BudgetContext.tsx - React context for sharing processed financial data

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ProcessingResult } from '../types/budget';
import { BalanceSheetData } from '../types/balanceSheet';
import { IncomeStatementData } from '../types/incomeStatement';

interface BudgetContextType {
    processingResult: ProcessingResult | null;
    setProcessingResult: (result: ProcessingResult | null) => void;
    balanceSheetData: BalanceSheetData | null;
    setBalanceSheetData: (data: BalanceSheetData | null) => void;
    incomeStatementData: IncomeStatementData | null;
    setIncomeStatementData: (data: IncomeStatementData | null) => void;
    clearData: () => void;
}

const BudgetContext = createContext<BudgetContextType | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
    const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
    const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData | null>(null);
    const [incomeStatementData, setIncomeStatementData] = useState<IncomeStatementData | null>(null);

    const clearData = () => {
        setProcessingResult(null);
        setBalanceSheetData(null);
        setIncomeStatementData(null);
    };

    return (
        <BudgetContext.Provider value={{
            processingResult,
            setProcessingResult,
            balanceSheetData,
            setBalanceSheetData,
            incomeStatementData,
            setIncomeStatementData,
            clearData
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

