// types/firestoreTypes.ts - TypeScript interfaces for Firestore documents

import { Timestamp } from 'firebase/firestore';
import { SpendingCategory } from './budget';
import { AssetCategory, LiabilityCategory } from './balanceSheet';
import { RevenueCategory, ExpenseCategory } from './incomeStatement';

// ============================================
// User Profile Types
// ============================================

export interface UserPreferences {
    theme: 'light' | 'dark';
    currency: string;
    notifications: boolean;
}

export interface UserProfile {
    email: string;
    displayName: string | null;
    photoURL: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    preferences: UserPreferences;
}

// ============================================
// AI Advisor Conversation Types
// ============================================

export interface ConversationDocument {
    userId: string;
    title: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    messageCount: number;
    sessionId: string | null;
}

export interface MessageDocument {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Timestamp;
    isFinancial?: boolean;
    suggestions?: string[];
}

export interface ConversationWithId extends ConversationDocument {
    id: string;
}

export interface MessageWithId extends MessageDocument {
    id: string;
}

// ============================================
// Budget/Transaction History Types
// ============================================

export interface TransactionDocument {
    date: string;
    description: string;
    amount: number;
    category: SpendingCategory;
    confidence: number;
    originalCategory: string | null;
}

export interface BudgetHistoryDocument {
    userId: string;
    fileName: string;
    uploadedAt: Timestamp;
    dateRange: {
        start: string;
        end: string;
    };
    totalTransactions: number;
    summary: Record<SpendingCategory, number>;
    monthlyBreakdown: Record<string, Record<SpendingCategory, number>>;
    // Merge tracking fields
    sourceFiles?: string[];      // List of file names that contributed to this data
    isMerged?: boolean;          // True if this document contains merged data
    lastMergedAt?: Timestamp;    // Timestamp of last merge operation
}

export interface BudgetHistoryWithId extends BudgetHistoryDocument {
    id: string;
}

// ============================================
// Balance Sheet History Types
// ============================================

export interface BalanceSheetItemDocument {
    name: string;
    type: 'asset' | 'liability';
    category: AssetCategory | LiabilityCategory;
    value: number;
    confidence: number;
}

export interface BalanceSheetDocument {
    userId: string;
    fileName: string;
    uploadedAt: Timestamp;
    date: string;
    totalItems: number;
    equity: number;
    assets: {
        total: number;
        byCategory: Record<AssetCategory, number>;
    };
    liabilities: {
        total: number;
        byCategory: Record<LiabilityCategory, number>;
    };
    // Merge tracking fields
    sourceFiles?: string[];      // List of file names that contributed to this data
    isMerged?: boolean;          // True if this document contains merged data
    lastMergedAt?: Timestamp;    // Timestamp of last merge operation
}

export interface BalanceSheetWithId extends BalanceSheetDocument {
    id: string;
}

// ============================================
// Income Statement History Types
// ============================================

export interface IncomeStatementItemDocument {
    description: string;
    type: 'revenue' | 'expense';
    category: RevenueCategory | ExpenseCategory;
    amount: number;
    confidence: number;
}

export interface IncomeStatementDocument {
    userId: string;
    fileName: string;
    uploadedAt: Timestamp;
    period: {
        start: string;
        end: string;
    };
    totalItems: number;
    grossProfit: number;
    netIncome: number;
    revenues: {
        total: number;
        byCategory: Record<RevenueCategory, number>;
    };
    expenses: {
        total: number;
        byCategory: Record<ExpenseCategory, number>;
    };
    // Merge tracking fields
    sourceFiles?: string[];      // List of file names that contributed to this data
    isMerged?: boolean;          // True if this document contains merged data
    lastMergedAt?: Timestamp;    // Timestamp of last merge operation
}

export interface IncomeStatementWithId extends IncomeStatementDocument {
    id: string;
}
