// types/recurringExpense.ts - TypeScript interfaces for recurring expense detection

import { SpendingCategory } from './budget';

export type RecurringFrequency =
    | 'weekly'
    | 'biweekly'
    | 'monthly'
    | 'quarterly'
    | 'yearly';

export interface RecurringExpense {
    merchant: string;
    amount: number;
    frequency: RecurringFrequency;
    category: SpendingCategory;
    last_charge: string;    // YYYY-MM-DD
    next_expected: string;  // YYYY-MM-DD
    occurrences: number;
    confidence: number;     // 0.0 to 1.0
}

export interface RecurringExpensesResult {
    success: true;
    recurring_expenses: RecurringExpense[];
    monthly_total: number;
    total_detected: number;
}

export interface RecurringExpensesError {
    success: false;
    error_code: string;
    message: string;
    details?: Record<string, unknown>;
}

export type RecurringExpensesResponse = RecurringExpensesResult | RecurringExpensesError;
