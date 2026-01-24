// types/incomeStatement.ts - TypeScript interfaces for Income Statement data

export type RevenueCategory =
    | 'sales'
    | 'services'
    | 'wages_salary'
    | 'interest_income'
    | 'investment_income'
    | 'rental_income'
    | 'royalties'
    | 'other_revenue';

export type ExpenseCategory =
    | 'cost_of_goods_sold'
    | 'salaries_wages'
    | 'rent'
    | 'utilities'
    | 'marketing'
    | 'insurance'
    | 'depreciation'
    | 'interest_expense'
    | 'taxes'
    | 'professional_fees'
    | 'office_supplies'
    | 'travel'
    | 'other_expenses';

export interface IncomeStatementItem {
    description: string;
    type: 'revenue' | 'expense';
    category: RevenueCategory | ExpenseCategory;
    amount: number;
    confidence: number; // AI confidence score 0.0 to 1.0
}

export interface IncomeStatementData {
    success: true;
    period: {
        start: string; // "YYYY-MM-DD"
        end: string;   // "YYYY-MM-DD"
    };
    total_items: number;
    items: IncomeStatementItem[];
    revenues: {
        items: IncomeStatementItem[];
        total: number;
        by_category: Record<RevenueCategory, number>;
    };
    expenses: {
        items: IncomeStatementItem[];
        total: number;
        by_category: Record<ExpenseCategory, number>;
    };
    gross_profit: number;   // Revenue - Cost of Goods Sold
    net_income: number;     // Total Revenue - Total Expenses
}

export interface IncomeStatementError {
    success: false;
    error_code: string;
    message: string;
    details?: Record<string, unknown>;
}

export type IncomeStatementResponse = IncomeStatementData | IncomeStatementError;
